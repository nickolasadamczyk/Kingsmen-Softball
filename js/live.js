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
    Games.ensureRules(g);
    if (!g.innings || !g.innings.length) g.innings = [{ us: 0, them: 0 }];
    if (g.currentInning == null) g.currentInning = 0;
    if (g.battingIndex == null) g.battingIndex = 0;
    if (!g.stats) g.stats = {};
    if (!g.bases) g.bases = { 1: null, 2: null, 3: null };
    if (g.outs == null) g.outs = 0;
    if (!g.plays) g.plays = [];
    if (!g.positions) g.positions = {};
    if (!g.hrUsed) g.hrUsed = { us: 0, them: 0 };
    if (!g.count) resetCount(g);
  }

  function resetCount(g) {
    var sc = g.rules.startingCount;
    g.count = { balls: sc.balls, strikes: sc.strikes };
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
          el('button', { class: 'btn sm ghost', text: '‹ Prev', disabled: g.currentInning === 0, onclick: function () { g.currentInning--; g.outs = 0; g.bases = { 1: null, 2: null, 3: null }; resetCount(g); Store.saveGame(); App.refresh(); } }),
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
    resetCount(g);
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

    var hrLeft = (g.rules.hrLimit == null) ? null : Math.max(0, g.rules.hrLimit - (g.hrUsed.us || 0));

    var card = el('div', { class: 'card atbat-card' }, [
      el('div', { class: 'row-between mb' }, [
        el('div', null, [
          el('div', { class: 'now-batting', text: 'Now Batting · #' + (g.battingIndex + 1) }),
          el('div', { class: 'name', style: 'font-size:1.2rem', text: batter ? batter.name : 'Unknown' })
        ]),
        el('div', { class: 'tiny muted center' }, [el('div', { text: 'On deck' }), el('strong', { text: onDeck ? onDeck.name : '—' })])
      ])
    ]);

    // Count tracker
    card.appendChild(countTracker(g, batterId));

    // HR limit note
    if (hrLeft != null) {
      card.appendChild(el('p', { class: 'tiny center ' + (hrLeft === 0 ? 'muted' : 'gold'), style: 'margin:2px 0 8px',
        text: hrLeft === 0 ? 'HR limit reached — next HR counts as ' + (g.rules.overLimitHrResult === 'single' ? 'a single' : 'an out') : ('Home runs left: ' + hrLeft + ' of ' + g.rules.hrLimit) }));
    }

    var grid = el('div', { class: 'ab-grid mb' });
    [
      ['1B', 'green', 'Single'], ['2B', 'green', 'Double'], ['3B', 'green', 'Triple'],
      ['HR', 'primary', 'Home Run'], ['BB', '', 'Walk'], ['SF', '', 'Sac Fly'],
      ['OUT', 'ghost', 'Out'], ['K', 'ghost', 'Strikeout'], ['FC', 'ghost', "Fielder's Ch."]
    ].forEach(function (o) {
      grid.appendChild(el('button', { class: 'btn ' + o[1], text: o[2], onclick: function () {
        if (o[0] === 'HR') { hitHomeRun(g, batterId); return; }
        if (o[0] === 'BB') { recordWalk(g, batterId); return; }
        openPlayEditor(g, batterId, o[0]);
      } }));
    });
    card.appendChild(grid);

    card.appendChild(el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn ghost sm', text: 'Reached on Error', onclick: function () { openPlayEditor(g, batterId, 'ROE'); } }),
      el('button', { class: 'btn sm', text: 'Skip ▸', onclick: function () { g.battingIndex = (g.battingIndex + 1) % order.length; Store.saveGame(); App.refresh(); } }),
      g._undo && g._undo.length ? el('button', { class: 'btn danger sm', text: '↶ Undo', onclick: function () { undoLast(g); } }) : null
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

  // Editor path: snapshot then apply.
  function applyPlay(g, batterId, code, ends, runners, rbi) {
    snapshot(g);
    applyResolved(g, batterId, code, ends, runners, rbi);
  }

  // Core mutation (no snapshot). Callers snapshot first.
  function applyResolved(g, batterId, code, ends, runners, rbi) {
    if (!g.stats[batterId]) g.stats[batterId] = Stats.blankLine();
    Stats.applyOutcome(g.stats[batterId], code, 0); // counts pa/ab/h/etc, rbi added below
    g.stats[batterId].rbi += (rbi || 0);
    if (code === 'HR') g.hrUsed.us = (g.hrUsed.us || 0) + 1;

    var newBases = { 1: null, 2: null, 3: null };
    var runs = 0, outs = 0;
    runners.forEach(function (r) {
      var d = ends[r.key];
      if (d === 'out') { outs++; }
      else if (d === 4) {
        runs++;
        if (!g.stats[r.pid]) g.stats[r.pid] = Stats.blankLine();
        g.stats[r.pid].r += 1;
      } else {
        newBases[d] = r.pid; // last writer wins on collision; user controls destinations
      }
    });

    g.bases = newBases;
    g.innings[g.currentInning].us = (g.innings[g.currentInning].us || 0) + runs;
    g.outs += outs;

    var order = battingOrder(g);
    g.battingIndex = (g.battingIndex + 1) % order.length;
    resetCount(g); // new batter up

    g.plays.push({ batterId: batterId, code: code, runs: runs, outs: outs });

    if (g.outs >= 3) { nextInning(g); return; } // strands runners, advances, resets count
    Store.saveGame();
  }

  /* ---------- pitch count (balls / strikes / fouls) ---------- */
  function countTracker(g, batterId) {
    var c = g.count;
    return el('div', { class: 'count-box mb' }, [
      el('div', { class: 'count-face' }, [
        el('div', { class: 'count-num' }, [el('span', { class: 'v', text: String(c.balls) }), el('span', { class: 'k', text: 'Balls' })]),
        el('div', { class: 'count-sep', text: '–' }),
        el('div', { class: 'count-num' }, [el('span', { class: 'v', text: String(c.strikes) }), el('span', { class: 'k', text: 'Strikes' })])
      ]),
      el('div', { class: 'btn-row count-btns', style: 'margin-top:8px' }, [
        el('button', { class: 'btn sm', text: 'Ball', onclick: function () { onBall(g, batterId); } }),
        el('button', { class: 'btn sm', text: 'Strike', onclick: function () { onStrike(g, batterId); } }),
        el('button', { class: 'btn sm', text: 'Foul', onclick: function () { onFoul(g, batterId); } })
      ])
    ]);
  }

  function onBall(g, batterId) {
    snapshot(g);
    g.count.balls += 1;
    if (g.count.balls >= g.rules.maxBalls) { recordWalk(g, batterId, true); return; }
    Store.saveGame(); App.refresh();
  }

  function onStrike(g, batterId) {
    snapshot(g);
    g.count.strikes += 1;
    if (g.count.strikes >= g.rules.maxStrikes) { autoOut(g, batterId, 'K', 'Strikeout'); return; }
    Store.saveGame(); App.refresh();
  }

  function onFoul(g, batterId) {
    snapshot(g);
    if (g.count.strikes >= g.rules.maxStrikes - 1) {
      // already at two strikes
      if (g.rules.foulOnThirdStrikeIsOut) { autoOut(g, batterId, 'K', 'Foul out (3rd strike)'); return; }
      // otherwise foul is a no-count; nothing changes
      if (g._undo) g._undo.pop(); // discard needless snapshot
      U.toast('Foul — no change');
      return;
    }
    g.count.strikes += 1;
    Store.saveGame(); App.refresh();
  }

  // Auto-record an out (strikeout / foul-out) with no base movement (no stealing in slow-pitch).
  function autoOut(g, batterId, code, label) {
    var runners = [];
    var ends = {};
    [3, 2, 1].forEach(function (n) { if (g.bases[n]) { ends['base' + n] = n; runners.push({ key: 'base' + n, start: n, pid: g.bases[n] }); } });
    ends['batter'] = 'out';
    runners.push({ key: 'batter', start: 0, pid: batterId, isBatter: true });
    applyResolved(g, batterId, code, ends, runners, 0); // snapshot already taken by count handler
    App.refresh();
    U.toast(label);
  }

  // Walk: batter to 1st, only forced runners advance (no stealing / wild pitches).
  function recordWalk(g, batterId, snapshotTaken) {
    if (!snapshotTaken) snapshot(g);
    var b = g.bases;
    var ends = {}, runners = [];
    // forced chain: runner on 1 always forced; on 2 forced only if 1 occupied; on 3 forced only if 1&2 occupied
    var forced1 = true;
    var forced2 = !!b[1];
    var forced3 = !!b[1] && !!b[2];
    [3, 2, 1].forEach(function (n) {
      if (!b[n]) return;
      var dest = n;
      if (n === 1 && forced1) dest = 2;
      if (n === 2 && forced2) dest = 3;
      if (n === 3 && forced3) dest = 4;
      ends['base' + n] = dest;
      runners.push({ key: 'base' + n, start: n, pid: b[n] });
    });
    ends['batter'] = 1;
    runners.push({ key: 'batter', start: 0, pid: batterId, isBatter: true });
    var forcedInRun = forced3 && b[3] ? 1 : 0; // bases loaded walk forces in a run
    applyResolved(g, batterId, 'BB', ends, runners, forcedInRun);
    App.refresh();
    U.toast('Walk');
  }

  // Home run with slow-pitch limit enforcement.
  function hitHomeRun(g, batterId) {
    var lim = g.rules.hrLimit;
    if (lim != null && (g.hrUsed.us || 0) >= lim) {
      if (g.rules.overLimitHrResult === 'single') {
        U.toast('HR limit reached — recorded as a single');
        openPlayEditor(g, batterId, '1B');
      } else {
        U.toast('HR limit reached — batter is out');
        openPlayEditor(g, batterId, 'OUT');
      }
      return;
    }
    openPlayEditor(g, batterId, 'HR');
  }

  /* ---------- undo via snapshot ---------- */
  function snapshot(g) {
    if (!g._undo) g._undo = [];
    g._undo.push(JSON.stringify({
      bases: g.bases, outs: g.outs, currentInning: g.currentInning,
      battingIndex: g.battingIndex, innings: g.innings, stats: g.stats,
      plays: g.plays, count: g.count, hrUsed: g.hrUsed
    }));
    if (g._undo.length > 250) g._undo.shift();
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
    if (snap.count) g.count = snap.count;
    if (snap.hrUsed) g.hrUsed = snap.hrUsed;
    Store.saveGame();
    App.refresh();
    U.toast('Undid last action');
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
