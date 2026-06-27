/* live.js — live scorekeeping: scoreboard, line score, at-bat recording */
(function (global) {
  'use strict';
  var el = U.el;

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
    if (!g.innings || !g.innings.length) g.innings = [{ us: 0, them: 0 }];
    if (g.currentInning == null) g.currentInning = 0;
    if (g.battingIndex == null) g.battingIndex = 0;
    if (!g.log) g.log = [];
    if (!g.stats) g.stats = {};
    Store.saveGame();
    App.go('live');
    U.toast('Game started — play ball!');
  }

  function render(view) {
    var g = Store.liveGame();
    view.appendChild(el('div', { class: 'view-head' }, [el('h2', { text: 'Live' })]));

    if (!g) {
      renderPicker(view);
      return;
    }
    ensureShape(g);

    // Scoreboard
    var us = Stats.totalRuns(g, 'us');
    var them = Stats.totalRuns(g, 'them');
    view.appendChild(el('div', { class: 'scoreboard mb' }, [
      el('div', { class: 'score-main' }, [
        el('div', null, [
          el('div', { class: 'score-team', text: 'Kingsmen' }),
          el('div', { class: 'score-num', text: String(us) })
        ]),
        el('div', { class: 'score-vs', text: 'vs' }),
        el('div', null, [
          el('div', { class: 'score-team', text: g.opponent || 'Opponent' }),
          el('div', { class: 'score-num', text: String(them) })
        ])
      ]),
      el('div', { class: 'inning-tag', text: 'Inning ' + (g.currentInning + 1) })
    ]));

    // Run controls for current inning
    var inn = g.innings[g.currentInning];
    view.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'row-between mb' }, [
        el('strong', { text: 'Inning ' + (g.currentInning + 1) + ' runs' }),
        el('div', { class: 'btn-row' }, [
          el('button', { class: 'btn sm ghost', text: '‹ Prev', disabled: g.currentInning === 0, onclick: function () { g.currentInning--; Store.saveGame(); App.refresh(); } }),
          el('button', { class: 'btn sm', text: 'Next ›', onclick: function () {
            g.currentInning++;
            if (g.currentInning >= g.innings.length) g.innings.push({ us: 0, them: 0 });
            Store.saveGame(); App.refresh();
          }})
        ])
      ]),
      el('div', { class: 'grid-2' }, [
        runStepper('Kingsmen', inn, 'us', g),
        runStepper(g.opponent || 'Opp', inn, 'them', g)
      ])
    ]));

    // Line score
    view.appendChild(Games.lineScoreTable(g));

    // At-bat panel
    view.appendChild(atBatPanel(g));

    // Box score
    var box = el('div', { class: 'card' }, [el('strong', { class: 'mb', text: 'Box Score' }), Games.boxScore(g)]);
    view.appendChild(box);

    // End game
    view.appendChild(el('button', { class: 'btn danger block mt', text: '🏁 End Game', onclick: function () {
      U.confirm('End the game and save it as final? Season stats will update.', function () {
        // trim trailing empty innings
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

  function runStepper(label, inn, key, g) {
    return el('div', { class: 'stat-box' }, [
      el('div', { class: 'k', text: label }),
      el('div', { class: 'v', text: String(inn[key] || 0) }),
      el('div', { class: 'btn-row', style: 'justify-content:center;margin-top:6px' }, [
        el('button', { class: 'btn sm ghost', text: '−', onclick: function () { inn[key] = Math.max(0, (inn[key] || 0) - 1); Store.saveGame(); App.refresh(); } }),
        el('button', { class: 'btn sm primary', text: '+1', onclick: function () { inn[key] = (inn[key] || 0) + 1; Store.saveGame(); App.refresh(); } })
      ])
    ]);
  }

  function atBatPanel(g) {
    var order = (g.lineup && g.lineup.length) ? g.lineup : Store.activePlayers().map(function (p) { return p.id; });
    if (!order.length) {
      return el('div', { class: 'card atbat-card' }, [
        el('p', { class: 'muted', text: 'Add players to the roster (and set a lineup) to record at-bats.' })
      ]);
    }
    if (g.battingIndex >= order.length) g.battingIndex = 0;
    var batterId = order[g.battingIndex];
    var batter = Store.getPlayer(batterId);
    var onDeckId = order[(g.battingIndex + 1) % order.length];
    var onDeck = Store.getPlayer(onDeckId);

    var card = el('div', { class: 'card atbat-card' }, [
      el('div', { class: 'row-between mb' }, [
        el('div', null, [
          el('div', { class: 'now-batting', text: 'Now Batting · #' + (g.battingIndex + 1) }),
          el('div', { class: 'name', style: 'font-size:1.2rem', text: batter ? batter.name : 'Unknown' })
        ]),
        el('div', { class: 'tiny muted center' }, [
          el('div', { text: 'On deck' }),
          el('strong', { text: onDeck ? onDeck.name : '—' })
        ])
      ])
    ]);

    var grid = el('div', { class: 'ab-grid mb' });
    [
      ['1B', 'green'], ['2B', 'green'], ['3B', 'green'],
      ['HR', 'primary'], ['BB', ''], ['SF', ''],
      ['OUT', 'ghost'], ['K', 'ghost'], ['FC', 'ghost']
    ].forEach(function (o) {
      var code = o[0];
      grid.appendChild(el('button', {
        class: 'btn ' + o[1],
        text: Stats.OUTCOMES[code].label.replace('Home Run', 'HR').replace('Sacrifice', 'Sac').replace('Strikeout', 'K').replace("Fielder's Choice", 'FC'),
        onclick: function () { recordAtBat(g, batterId, code); }
      }));
    });
    card.appendChild(grid);

    // ROE + undo row
    card.appendChild(el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn ghost sm', text: 'Reached on Error', onclick: function () { recordAtBat(g, batterId, 'ROE'); } }),
      el('button', { class: 'btn sm', text: 'Skip ▸', onclick: function () { g.battingIndex = (g.battingIndex + 1) % order.length; Store.saveGame(); App.refresh(); } }),
      g.log && g.log.length ? el('button', { class: 'btn danger sm', text: '↶ Undo', onclick: function () { undoLast(g); } }) : null
    ]));
    return card;
  }

  function recordAtBat(g, playerId, code) {
    var def = Stats.OUTCOMES[code];
    var isHit = ['1B', '2B', '3B', 'HR'].indexOf(code) > -1;
    var rbi = code === 'HR' ? 1 : 0;
    var addRuns = code === 'HR' ? 1 : 0;
    var batterScored = code === 'HR';

    U.modal({
      title: def.label,
      body: function (b, close) {
        b.appendChild(el('p', { class: 'small muted mb', text: (Store.getPlayer(playerId) || {}).name + ' — ' + def.label }));

        var rbiVal = el('div', { class: 'v', text: String(rbi) });
        b.appendChild(el('div', { class: 'stat-box mb' }, [
          el('div', { class: 'k', text: 'RBIs on play' }),
          rbiVal,
          stepperRow(function () { rbi = Math.max(0, rbi - 1); rbiVal.textContent = rbi; }, function () { rbi = Math.min(4, rbi + 1); rbiVal.textContent = rbi; })
        ]));

        var runVal = el('div', { class: 'v', text: String(addRuns) });
        b.appendChild(el('div', { class: 'stat-box mb' }, [
          el('div', { class: 'k', text: 'Runs scored on play (adds to score)' }),
          runVal,
          stepperRow(function () { addRuns = Math.max(0, addRuns - 1); runVal.textContent = addRuns; }, function () { addRuns = Math.min(4, addRuns + 1); runVal.textContent = addRuns; })
        ]));

        var scoredChk = el('input', { type: 'checkbox' });
        if (batterScored) scoredChk.checked = true;
        var scoredLabel = el('label', { class: 'field', style: 'display:flex;align-items:center;gap:10px' }, [
          scoredChk, el('span', { text: 'Batter scored a run', style: 'margin:0' })
        ]);
        b.appendChild(scoredLabel);

        b.appendChild(el('div', { class: 'btn-row mt' }, [
          el('button', { class: 'btn primary block', text: 'Record', onclick: function () {
            apply(g, playerId, code, rbi, addRuns, scoredChk.checked);
            close();
            App.refresh();
            U.toast(def.label + ' recorded');
          }}),
          el('button', { class: 'btn ghost', text: 'Cancel', onclick: close })
        ]));
      }
    });
  }

  function apply(g, playerId, code, rbi, addRuns, batterScored) {
    if (!g.stats[playerId]) g.stats[playerId] = Stats.blankLine();
    var line = g.stats[playerId];
    Stats.applyOutcome(line, code, rbi);
    if (batterScored) line.r = (line.r || 0) + 1;
    if (addRuns) g.innings[g.currentInning].us = (g.innings[g.currentInning].us || 0) + addRuns;

    g.log.push({ playerId: playerId, code: code, rbi: rbi, addRuns: addRuns, batterScored: batterScored, inning: g.currentInning, idx: g.battingIndex });

    var order = (g.lineup && g.lineup.length) ? g.lineup : Store.activePlayers().map(function (p) { return p.id; });
    g.battingIndex = (g.battingIndex + 1) % order.length;
    Store.saveGame();
  }

  function undoLast(g) {
    var last = g.log.pop();
    if (!last) return;
    var line = g.stats[last.playerId];
    if (line) {
      var o = Stats.OUTCOMES[last.code];
      Object.keys(o).forEach(function (k) { if (k !== 'label') line[k] = Math.max(0, (line[k] || 0) - o[k]); });
      if (last.rbi) line.rbi = Math.max(0, line.rbi - last.rbi);
      if (last.batterScored) line.r = Math.max(0, (line.r || 0) - 1);
    }
    if (last.addRuns && g.innings[last.inning]) {
      g.innings[last.inning].us = Math.max(0, (g.innings[last.inning].us || 0) - last.addRuns);
    }
    g.battingIndex = last.idx;
    Store.saveGame();
    App.refresh();
    U.toast('Undid last at-bat');
  }

  function stepperRow(onMinus, onPlus) {
    return el('div', { class: 'btn-row', style: 'justify-content:center;margin-top:6px' }, [
      el('button', { class: 'btn sm ghost', text: '−', onclick: onMinus }),
      el('button', { class: 'btn sm primary', text: '+', onclick: onPlus })
    ]);
  }

  function renderPicker(view) {
    var scheduled = Store.games().filter(function (g) { return g.status === 'scheduled'; })
      .sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });

    view.appendChild(U.emptyState('⚾', 'No game in progress', 'Start a scheduled game to keep score and stats live.'));

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

  function ensureShape(g) {
    if (!g.innings || !g.innings.length) g.innings = [{ us: 0, them: 0 }];
    if (g.currentInning == null) g.currentInning = 0;
    if (g.battingIndex == null) g.battingIndex = 0;
    if (!g.log) g.log = [];
    if (!g.stats) g.stats = {};
  }

  global.Live = { render: render, startGame: startGame };
})(window);
