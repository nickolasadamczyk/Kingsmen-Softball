/* live.js — live scorekeeping with base-by-base play tracking */
(function (global) {
  'use strict';
  var el = U.el;

  /* ---------- game lifecycle ---------- */
  function startGame(id) {
    var g = Store.getGame(id);
    if (!g) return;
    var existingLive = Store.liveGame();
    if (existingLive && existingLive.id !== id) {
      U.toast('Finish the current live game first.');
      App.go('live');
      return;
    }
    g.status = 'live';
    ensureShape(g);
    Store.saveGame();
    App.go('live');
    U.toast('Game started — play ball!');
  }

  function ensureShape(g) {
    if (!g.innings || !g.innings.length) g.innings = [{ us: 0, them: 0 }];
    if (g.currentInning == null) g.currentInning = 0;
    if (g.battingIndex == null) g.battingIndex = 0;
    if (!g.stats) g.stats = {};
    if (!g.bases) g.bases = { 1: null, 2: null, 3: null };
    if (g.outs == null) g.outs = 0;
    if (!g.plays) g.plays = [];
    if (!g.positions) g.positions = {};
  }

  function battingOrder(g) {
    return (g.lineup && g.lineup.length) ? g.lineup : Store.activePlayers().map(function (p) { return p.id; });
  }

  /* ---------- main render ---------- */
  function render(view) {
    var g = Store.liveGame();
    view.appendChild(el('div', { class: 'view-head' }, [el('h2', { text: 'Live' })]));

    if (!g) { renderPicker(view); return; }
    ensureShape(g);

    var us = Stats.totalRuns(g, 'us');
    var them = Stats.totalRuns(g, 'them');

    // Scoreboard
    view.appendChild(el('div', { class: 'scoreboard mb' }, [
      el('div', { class: 'score-main' }, [
        el('div', null, [el('div', { class: 'score-team', text: 'Kingsmen' }), el('div', { class: 'score-num', text: String(us) })]),
        el('div', { class: 'score-vs', text: 'vs' }),
        el('div', null, [el('div', { class: 'score-team', text: g.opponent || 'Opponent' }), el('div', { class: 'score-num', text: String(them) })])
      ]),
      el('div', { class: 'inning-tag', text: 'Our inning ' + (g.currentInning + 1) + '  ·  ' + g.outs + ' out' + (g.outs === 1 ? '' : 's') })
    ]));

    // Inning / opponent controls
    var inn = g.innings[g.currentInning];
    view.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'row-between mb' }, [
        el('strong', { text: 'Inning ' + (g.currentInning + 1) }),
        el('div', { class: 'btn-row' }, [
          el('button', { class: 'btn sm ghost', text: '‹ Prev', disabled: g.currentInning === 0, onclick: function () { g.currentInning--; g.outs = 0; g.bases = { 1: null, 2: null, 3: null }; Store.saveGame(); App.refresh(); } }),
          el('button', { class: 'btn sm', text: 'New inning ›', onclick: function () { nextInning(g); } })
        ])
      ]),
      el('div', { class: 'grid-2' }, [
        el('div', { class: 'stat-box' }, [
          el('div', { class: 'k', text: 'Kingsmen (this inning)' }),
          el('div', { class: 'v', text: String(inn.us || 0) }),
          el('div', { class: 'tiny muted', text: 'auto from plays' })
        ]),
        el('div', { class: 'stat-box' }, [
          el('div', { class: 'k', text: (g.opponent || 'Opp') + ' (this inning)' }),
          el('div', { class: 'v', text: String(inn.them || 0) }),
          el('div', { class: 'btn-row', style: 'justify-content:center;margin-top:6px' }, [
            el('button', { class: 'btn sm ghost', text: '−', onclick: function () { inn.them = Math.max(0, (inn.them || 0) - 1); Store.saveGame(); App.refresh(); } }),
            el('button', { class: 'btn sm primary', text: '+1', onclick: function () { inn.them = (inn.them || 0) + 1; Store.saveGame(); App.refresh(); } })
          ])
        ])
      ])
    ]));

    // Diamond + outs
    view.appendChild(diamondCard(g));

    // At-bat panel
    view.appendChild(atBatPanel(g));

    // Line score
    view.appendChild(Games.lineScoreTable(g));

    // Box score
    view.appendChild(el('div', { class: 'card' }, [el('strong', { class: 'mb', text: 'Box Score' }), Games.boxScore(g)]));

    // End game
    view.appendChild(el('button', { class: 'btn danger block mt', text: '🏁 End Game', onclick: function () {
      U.confirm('End the game and save it as final? Season stats will update.', function () {
        while (g.innings.length > 1) {
          var last = g.innings[g.innings.length - 1];
          if ((last.us || 0) === 0 && (last.them || 0) === 0) g.innings.pop(); else break;
        }
        g.status = 'final';
        Store.saveGame();
        App.go('games');
        U.toast('Final saved');
      }, { yesText: 'End Game' });
    }}));
  }

  function nextInning(g) {
    g.currentInning++;
    if (g.currentInning >= g.innings.length) g.innings.push({ us: 0, them: 0 });
    g.outs = 0;
    g.bases = { 1: null, 2: null, 3: null };
    Store.saveGame();
    App.refresh();
  }

  /* ---------- diamond ---------- */
  function diamondCard(g) {
    var outsDots = el('div', { class: 'outs-row' });
    for (var i = 0; i < 3; i++) outsDots.appendChild(el('span', { class: 'out-dot' + (i < g.outs ? ' on' : '') }));

    return el('div', { class: 'card' }, [
      el('div', { class: 'row-between mb' }, [
        el('strong', { text: 'On base' }),
        el('div', { class: 'outs-wrap' }, [el('span', { class: 'tiny muted', text: 'Outs' }), outsDots])
      ]),
      diamond(g.bases),
      runnersLegend(g.bases)
    ]);
  }

  function diamond(bases) {
    function baseEl(num, cls) {
      var pid = bases[num];
      var p = pid ? Store.getPlayer(pid) : null;
      return el('div', { class: 'base ' + cls + (pid ? ' occupied' : '') }, [
        el('span', { class: 'base-runner', text: p ? U.initials(p.name) : '' })
      ]);
    }
    return el('div', { class: 'diamond' }, [
      baseEl(2, 'b2'),
      baseEl(3, 'b3'),
      baseEl(1, 'b1'),
      el('div', { class: 'base home' }, [el('span', { class: 'base-runner', text: '🏠' })])
    ]);
  }

  function runnersLegend(bases) {
    var on = [3, 2, 1].filter(function (n) { return bases[n]; });
    if (!on.length) return el('p', { class: 'tiny muted center', text: 'Bases empty' });
    var wrap = el('div', { class: 'chips center mt' });
    on.forEach(function (n) {
      var p = Store.getPlayer(bases[n]);
      wrap.appendChild(el('span', { class: 'chip on', text: baseName(n) + ': ' + (p ? p.name : '—') }));
    });
    return wrap;
  }

  function baseName(n) { return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : 'Home'; }

  /* ---------- at-bat ---------- */
  function atBatPanel(g) {
    var order = battingOrder(g);
    if (!order.length) {
      return el('div', { class: 'card atbat-card' }, [el('p', { class: 'muted', text: 'Add players to the roster (and set a lineup) to record at-bats.' })]);
    }
    if (g.battingIndex >= order.length) g.battingIndex = 0;
    var batterId = order[g.battingIndex];
    var batter = Store.getPlayer(batterId);
    var onDeck = Store.getPlayer(order[(g.battingIndex + 1) % order.length]);

    var card = el('div', { class: 'card atbat-card' }, [
      el('div', { class: 'row-between mb' }, [
        el('div', null, [
          el('div', { class: 'now-batting', text: 'Now Batting · #' + (g.battingIndex + 1) }),
          el('div', { class: 'name', style: 'font-size:1.2rem', text: batter ? batter.name : 'Unknown' })
        ]),
        el('div', { class: 'tiny muted center' }, [el('div', { text: 'On deck' }), el('strong', { text: onDeck ? onDeck.name : '—' })])
      ])
    ]);

    var grid = el('div', { class: 'ab-grid mb' });
    [
      ['1B', 'green', 'Single'], ['2B', 'green', 'Double'], ['3B', 'green', 'Triple'],
      ['HR', 'primary', 'Home Run'], ['BB', '', 'Walk'], ['SF', '', 'Sac Fly'],
      ['OUT', 'ghost', 'Out'], ['K', 'ghost', 'Strikeout'], ['FC', 'ghost', "Fielder's Ch."]
    ].forEach(function (o) {
      grid.appendChild(el('button', { class: 'btn ' + o[1], text: o[2], onclick: function () { openPlayEditor(g, batterId, o[0]); } }));
    });
    card.appendChild(grid);

    card.appendChild(el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn ghost sm', text: 'Reached on Error', onclick: function () { openPlayEditor(g, batterId, 'ROE'); } }),
      el('button', { class: 'btn sm', text: 'Skip ▸', onclick: function () { g.battingIndex = (g.battingIndex + 1) % order.length; Store.saveGame(); App.refresh(); } }),
      g.plays && g.plays.length ? el('button', { class: 'btn danger sm', text: '↶ Undo', onclick: function () { undoLast(g); } }) : null
    ]));
    return card;
  }

  // Where the batter ends up by default, per result code. 1/2/3 = base, 4 = home, 'out' = out.
  function batterDefaultDest(code) {
    return { '1B': 1, '2B': 2, '3B': 3, 'HR': 4, 'BB': 1, 'FC': 1, 'ROE': 1, 'SF': 'out', 'OUT': 'out', 'K': 'out' }[code];
  }

  /* The play editor: set the batter's base AND advance each existing runner. */
  function openPlayEditor(g, batterId, code) {
    var def = Stats.OUTCOMES[code];
    var batter = Store.getPlayer(batterId);
    var batterDest = batterDefaultDest(code);
    var adv = (typeof batterDest === 'number') ? batterDest : (code === 'SF' ? 1 : 0); // default bases existing runners advance

    // Build runner list: existing runners (from 3rd down) then the batter.
    var ends = {}; // runnerKey -> dest (1..4 or 'out')
    var runners = [];
    [3, 2, 1].forEach(function (n) {
      if (g.bases[n]) {
        var dest = Math.min(n + adv, 4);
        ends['base' + n] = dest;
        runners.push({ key: 'base' + n, start: n, pid: g.bases[n], label: Store.getPlayer(g.bases[n]) });
      }
    });
    ends['batter'] = batterDest;
    runners.push({ key: 'batter', start: 0, pid: batterId, label: batter, isBatter: true });

    U.modal({
      title: def.label,
      body: function (b, close) {
        b.appendChild(el('p', { class: 'small muted mb', text: (batter ? batter.name : 'Batter') + ' — ' + def.label + '. Set where each runner ends up.' }));

        var rbiState = { val: 0 };
        var summary = el('div', { class: 'play-summary mb' });

        function destOptions(start, isBatter) {
          // allowed destinations
          var opts = [];
          if (isBatter) {
            opts.push({ v: 'out', t: 'Out' });
            [1, 2, 3, 4].forEach(function (d) { opts.push({ v: d, t: d === 4 ? 'Home' : baseName(d) }); });
          } else {
            opts.push({ v: 'out', t: 'Out' });
            opts.push({ v: start, t: 'Hold ' + baseName(start) });
            for (var d = start + 1; d <= 4; d++) opts.push({ v: d, t: d === 4 ? 'Home' : baseName(d) });
          }
          return opts;
        }

        runners.forEach(function (r) {
          var row = el('div', { class: 'runner-row' });
          row.appendChild(el('div', { class: 'runner-name' }, [
            el('strong', { text: r.label ? r.label.name : 'Unknown' }),
            el('div', { class: 'tiny muted', text: r.isBatter ? 'Batter' : ('was on ' + baseName(r.start)) })
          ]));
          var segs = el('div', { class: 'seg wrap' });
          destOptions(r.start, r.isBatter).forEach(function (opt) {
            var btn = el('button', {
              text: opt.t,
              class: ends[r.key] === opt.v ? 'on-sel' : '',
              onclick: function () { ends[r.key] = opt.v; redraw(); }
            });
            btn._val = opt.v;
            segs.appendChild(btn);
          });
          row._segs = segs;
          row._rkey = r.key;
          row.appendChild(segs);
          b.appendChild(row);
        });

        // RBI stepper
        var rbiBox = el('div', { class: 'stat-box mb' }, [
          el('div', { class: 'k', text: 'RBIs credited to batter' }),
          (rbiState.el = el('div', { class: 'v', text: '0' })),
          el('div', { class: 'btn-row', style: 'justify-content:center;margin-top:6px' }, [
            el('button', { class: 'btn sm ghost', text: '−', onclick: function () { rbiState.val = Math.max(0, rbiState.val - 1); rbiState.manual = true; rbiState.el.textContent = rbiState.val; } }),
            el('button', { class: 'btn sm primary', text: '+', onclick: function () { rbiState.val = Math.min(4, rbiState.val + 1); rbiState.manual = true; rbiState.el.textContent = rbiState.val; } })
          ])
        ]);

        b.appendChild(summary);
        b.appendChild(rbiBox);

        b.appendChild(el('div', { class: 'btn-row mt' }, [
          el('button', { class: 'btn primary block', text: 'Record Play', onclick: function () {
            applyPlay(g, batterId, code, ends, runners, rbiState.val);
            close();
            App.refresh();
            U.toast(def.label + ' recorded');
          }}),
          el('button', { class: 'btn ghost', text: 'Cancel', onclick: close })
        ]));

        redraw();

        function redraw() {
          // update selected button styles
          [].forEach.call(b.querySelectorAll('.runner-row'), function (row) {
            [].forEach.call(row._segs.children, function (btn) {
              btn.className = (ends[row._rkey] === btn._val) ? 'on-sel' : '';
            });
          });
          // compute runs + outs
          var runs = 0, outs = 0;
          runners.forEach(function (r) {
            var d = ends[r.key];
            if (d === 'out') outs++;
            else if (d === 4) runs++;
          });
          // auto RBI default = runs scored (unless error play, or user overrode)
          if (!rbiState.manual) {
            rbiState.val = (code === 'ROE') ? Math.max(0, runs - 0) : runs;
            // errors typically don't earn RBIs; default ROE to 0
            if (code === 'ROE') rbiState.val = 0;
            rbiState.el.textContent = rbiState.val;
          }
          var willOuts = g.outs + outs;
          summary.innerHTML = '';
          summary.appendChild(el('span', { class: 'pill in', text: runs + ' run' + (runs === 1 ? '' : 's') }));
          summary.appendChild(el('span', { class: 'pill ' + (willOuts >= 3 ? 'out' : 'maybe'), text: '+' + outs + ' out → ' + Math.min(willOuts, 3) + ' total' + (willOuts >= 3 ? ' (inning over)' : '') }));
        }
      }
    });
  }

  function applyPlay(g, batterId, code, ends, runners, rbi) {
    snapshot(g); // for undo

    // batting stat line
    if (!g.stats[batterId]) g.stats[batterId] = Stats.blankLine();
    Stats.applyOutcome(g.stats[batterId], code, 0); // counts pa/ab/h/etc, rbi added below
    g.stats[batterId].rbi += (rbi || 0);

    // resolve new base state + runs + outs from the editor
    var newBases = { 1: null, 2: null, 3: null };
    var runs = 0, outs = 0;
    runners.forEach(function (r) {
      var d = ends[r.key];
      if (d === 'out') { outs++; }
      else if (d === 4) {
        runs++;
        if (g.stats[r.pid]) g.stats[r.pid].r += 1; else { g.stats[r.pid] = Stats.blankLine(); g.stats[r.pid].r += 1; }
      } else {
        // last writer wins if collision; user controls destinations
        newBases[d] = r.pid;
      }
    });

    g.bases = newBases;
    g.innings[g.currentInning].us = (g.innings[g.currentInning].us || 0) + runs;
    g.outs += outs;

    var order = battingOrder(g);
    g.battingIndex = (g.battingIndex + 1) % order.length;

    g.plays.push({ batterId: batterId, code: code, runs: runs, outs: outs });

    if (g.outs >= 3) {
      // inning over — strand runners, advance
      nextInning(g);
      return;
    }
    Store.saveGame();
  }

  /* ---------- undo via snapshot ---------- */
  function snapshot(g) {
    if (!g._undo) g._undo = [];
    g._undo.push(JSON.stringify({
      bases: g.bases, outs: g.outs, currentInning: g.currentInning,
      battingIndex: g.battingIndex, innings: g.innings, stats: g.stats, plays: g.plays
    }));
    // cap history
    if (g._undo.length > 60) g._undo.shift();
  }

  function undoLast(g) {
    if (!g._undo || !g._undo.length) { U.toast('Nothing to undo'); return; }
    var snap = JSON.parse(g._undo.pop());
    g.bases = snap.bases;
    g.outs = snap.outs;
    g.currentInning = snap.currentInning;
    g.battingIndex = snap.battingIndex;
    g.innings = snap.innings;
    g.stats = snap.stats;
    g.plays = snap.plays;
    Store.saveGame();
    App.refresh();
    U.toast('Undid last play');
  }

  /* ---------- picker (no live game) ---------- */
  function renderPicker(view) {
    var scheduled = Store.games().filter(function (g) { return g.status === 'scheduled'; })
      .sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });

    view.appendChild(U.emptyState('⚾', 'No game in progress', 'Start a scheduled game to keep score play-by-play.'));

    if (scheduled.length) {
      view.appendChild(el('p', { class: 'small gold mb', text: 'Start a game' }));
      var list = el('div', { class: 'list' });
      scheduled.forEach(function (g) {
        list.appendChild(el('div', { class: 'card' }, [
          el('div', { class: 'row-between' }, [
            el('div', null, [
              el('div', { class: 'name', html: '<strong>' + (g.homeAway === 'away' ? '@ ' : 'vs ') + U.escapeHtml(g.opponent || 'TBD') + '</strong>' }),
              el('div', { class: 'sub muted small', text: U.fmtDateTime(g.date) })
            ]),
            el('button', { class: 'btn primary sm', text: 'Start', onclick: function () { startGame(g.id); } })
          ])
        ]));
      });
      view.appendChild(list);
    } else {
      view.appendChild(el('button', { class: 'btn primary block', text: '+ New Game', onclick: function () { Games.editGame(null); } }));
    }
  }

  global.Live = { render: render, startGame: startGame };
})(window);
