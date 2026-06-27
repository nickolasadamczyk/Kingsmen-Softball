/* games.js — schedule, game CRUD, lineup builder, box scores */
(function (global) {
  'use strict';
  var el = U.el;

  function newGameShape() {
    return {
      date: U.todayISO(),
      opponent: '',
      location: '',
      homeAway: 'home',
      status: 'scheduled',
      innings: [],
      lineup: [],
      attendance: {},
      stats: {},
      battingIndex: 0,
      notes: ''
    };
  }

  function render(view) {
    var games = Store.games().slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    var rec = Stats.teamRecord();

    view.appendChild(el('div', { class: 'view-head' }, [
      el('h2', { text: 'Games' }),
      el('button', { class: 'btn primary sm', text: '+ New Game', onclick: function () { editGame(null); } })
    ]));
    view.appendChild(el('div', { class: 'stat-strip mb' }, [
      Players.statBox(rec.w + '-' + rec.l + (rec.t ? '-' + rec.t : ''), 'Record'),
      Players.statBox(games.filter(function (g) { return g.status === 'final'; }).length, 'Played'),
      Players.statBox(games.filter(function (g) { return g.status === 'scheduled'; }).length, 'Upcoming')
    ]));

    if (!games.length) {
      view.appendChild(U.emptyState('📅', 'No games yet', 'Schedule your first game.'));
      return;
    }

    var live = games.filter(function (g) { return g.status === 'live'; });
    var upcoming = games.filter(function (g) { return g.status === 'scheduled'; }).sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    var past = games.filter(function (g) { return g.status === 'final'; });

    if (live.length) { view.appendChild(group('Live Now')); live.forEach(function (g) { view.appendChild(gameCard(g)); }); }
    if (upcoming.length) { view.appendChild(group('Upcoming')); upcoming.forEach(function (g) { view.appendChild(gameCard(g)); }); }
    if (past.length) { view.appendChild(group('Final')); past.forEach(function (g) { view.appendChild(gameCard(g)); }); }
  }

  function group(t) { return el('h3', { class: 'mb', style: 'margin-top:8px;font-size:1rem;color:var(--gold-light)', text: t }); }

  function gameCard(g) {
    var us = Stats.totalRuns(g, 'us');
    var them = Stats.totalRuns(g, 'them');
    var resultPill = null;
    if (g.status === 'final') {
      var cls = us > them ? 'win' : us < them ? 'loss' : 'tie';
      var label = us > them ? 'W' : us < them ? 'L' : 'T';
      resultPill = el('span', { class: 'pill ' + cls, text: label + ' ' + us + '-' + them });
    } else if (g.status === 'live') {
      resultPill = el('span', { class: 'pill live', text: 'LIVE ' + us + '-' + them });
    } else {
      resultPill = el('span', { class: 'pill scheduled', text: 'Scheduled' });
    }

    return el('div', { class: 'card tap', onclick: function () { gameDetail(g.id); } }, [
      el('div', { class: 'row-between' }, [
        el('div', null, [
          el('div', { class: 'name', html: '<strong>' + (g.homeAway === 'away' ? '@ ' : 'vs ') + U.escapeHtml(g.opponent || 'TBD') + '</strong>' }),
          el('div', { class: 'sub muted small', text: U.fmtDateTime(g.date) + (g.location ? '  ·  ' + g.location : '') })
        ]),
        resultPill
      ])
    ]);
  }

  function gameDetail(id) {
    var g = Store.getGame(id);
    if (!g) return;
    var us = Stats.totalRuns(g, 'us');
    var them = Stats.totalRuns(g, 'them');

    U.modal({
      title: (g.homeAway === 'away' ? '@ ' : 'vs ') + (g.opponent || 'TBD'),
      body: function (b) {
        b.appendChild(el('div', { class: 'small muted mb', text: U.fmtDateTime(g.date) + (g.location ? '  ·  ' + g.location : '') }));

        if (g.status !== 'scheduled') {
          b.appendChild(el('div', { class: 'stat-strip mb' }, [
            Players.statBox(us, 'Us'),
            Players.statBox(them, g.opponent || 'Them')
          ]));
          b.appendChild(lineScoreTable(g));
          b.appendChild(boxScore(g));
        }

        var att = attendanceSummary(g);
        b.appendChild(el('div', { class: 'small muted mb', text: 'Checked in: ' + att.in + ' in · ' + att.maybe + ' maybe · ' + att.out + ' out' }));

        b.appendChild(el('div', { class: 'divider' }));
        var actions = el('div', { class: 'btn-row' });
        if (g.status === 'scheduled') {
          actions.appendChild(el('button', { class: 'btn green', text: '🔨 Set Lineup', onclick: function () { closeModal(); lineupBuilder(id); } }));
          actions.appendChild(el('button', { class: 'btn primary', text: '⚾ Start Game', onclick: function () { closeModal(); Live.startGame(id); } }));
        } else if (g.status === 'live') {
          actions.appendChild(el('button', { class: 'btn primary', text: '⚾ Open Live', onclick: function () { closeModal(); App.go('live'); } }));
        }
        actions.appendChild(el('button', { class: 'btn', text: 'Edit', onclick: function () { closeModal(); editGame(id); } }));
        actions.appendChild(el('button', { class: 'btn danger', text: 'Delete', onclick: function () {
          U.confirm('Delete this game and its stats?', function () { Store.removeGame(id); closeModal(); App.refresh(); }, { danger: true, yesText: 'Delete' });
        }}));
        b.appendChild(actions);
      }
    });
  }

  function lineScoreTable(g) {
    var innings = g.innings || [];
    var table = el('table');
    var head = el('tr', null, [el('th', { text: '' })]);
    for (var i = 0; i < innings.length; i++) head.appendChild(el('th', { text: String(i + 1) }));
    head.appendChild(el('th', { text: 'R' }));
    table.appendChild(head);

    ['us', 'them'].forEach(function (side) {
      var row = el('tr', null, [el('td', { class: 'team', text: side === 'us' ? 'Kingsmen' : (g.opponent || 'Opp') })]);
      var tot = 0;
      innings.forEach(function (inn) { var v = inn[side] || 0; tot += v; row.appendChild(el('td', { text: String(v) })); });
      row.appendChild(el('td', { class: 'tot', text: String(tot) }));
      table.appendChild(row);
    });
    return el('div', { class: 'linescore mb' }, table);
  }

  function boxScore(g) {
    var pids = Object.keys(g.stats || {}).filter(function (pid) { return g.stats[pid].pa > 0; });
    if (!pids.length) return el('p', { class: 'muted small mb', text: 'No batting recorded.' });

    // order by lineup if present
    if (g.lineup && g.lineup.length) {
      pids.sort(function (a, b) {
        var ia = g.lineup.indexOf(a), ib = g.lineup.indexOf(b);
        if (ia === -1) ia = 999; if (ib === -1) ib = 999;
        return ia - ib;
      });
    }

    var cols = ['AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'K', 'AVG'];
    var table = el('table', { class: 'stats' });
    var head = el('tr', null, [el('th', { text: 'Batter' })].concat(cols.map(function (c) { return el('th', { text: c }); })));
    table.appendChild(head);

    pids.forEach(function (pid) {
      var p = Store.getPlayer(pid);
      var s = g.stats[pid];
      var d = Stats.derive(s);
      var name = p ? p.name : 'Unknown';
      table.appendChild(el('tr', null, [
        el('td', { text: name }),
        td(s.ab), td(s.r), td(s.h), td(s.b2), td(s.b3), td(s.hr), td(s.rbi), td(s.bb), td(s.k),
        el('td', { class: 'hl', text: U.avg3(d.avg) })
      ]));
    });
    return el('div', { class: 'table-wrap mb' }, table);
  }
  function td(v) { return el('td', { text: String(v || 0) }); }

  function attendanceSummary(g) {
    var c = { in: 0, out: 0, maybe: 0 };
    Object.keys(g.attendance || {}).forEach(function (k) {
      var s = g.attendance[k];
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }

  function editGame(id) {
    var g = id ? Store.getGame(id) : newGameShape();
    var isNew = !id;

    U.modal({
      title: isNew ? 'New Game' : 'Edit Game',
      body: function (b, close) {
        var opp = Players.field('Opponent', 'text', g.opponent);
        var date = Players.field('Date & Time', 'datetime-local', g.date);
        var loc = Players.field('Location / Field', 'text', g.location);
        var ha = Players.selectField('Home / Away', g.homeAway, ['home', 'away'], ['Home', 'Away']);
        var notes = el('textarea', { rows: '2' }); notes.value = g.notes || '';

        b.appendChild(opp.wrap);
        b.appendChild(el('div', { class: 'grid-2' }, [date.wrap, ha.wrap]));
        b.appendChild(loc.wrap);
        b.appendChild(el('label', { class: 'field' }, [el('span', { text: 'Notes' }), notes]));

        b.appendChild(el('button', { class: 'btn primary block mt', text: isNew ? 'Create Game' : 'Save', onclick: function () {
          var patch = {
            opponent: opp.input.value.trim(),
            date: date.input.value,
            location: loc.input.value.trim(),
            homeAway: ha.input.value,
            notes: notes.value.trim()
          };
          if (isNew) { Object.assign(g, patch); Store.addGame(g); }
          else Store.updateGame(id, patch);
          close(); App.refresh(); U.toast('Saved');
        }}));
      }
    });
  }

  /* ---- Lineup builder ---- */
  function lineupBuilder(id) {
    var g = Store.getGame(id);
    if (!g) return;
    if (!g.lineup) g.lineup = [];

    U.modal({
      title: 'Batting Lineup',
      body: function (b, close) {
        render();

        function render() {
          U.clear(b);
          var checkedIn = Store.activePlayers().filter(function (p) { return g.attendance && g.attendance[p.id] === 'in'; });
          b.appendChild(el('p', { class: 'small muted mb', text: 'Tap to add to the order. Use ▲▼ to reorder. ' + (checkedIn.length ? checkedIn.length + ' checked in.' : 'Tip: check players in first.') }));

          // current order
          if (g.lineup.length) {
            var ol = el('div', { class: 'list mb' });
            g.lineup.forEach(function (pid, idx) {
              var p = Store.getPlayer(pid);
              if (!p) return;
              ol.appendChild(el('div', { class: 'card' }, [
                el('div', { class: 'person' }, [
                  el('div', { class: 'avatar', text: String(idx + 1) }),
                  el('div', { class: 'meta' }, [
                    el('div', { class: 'name', text: p.name }),
                    el('div', { class: 'sub', text: p.positions && p.positions.length ? p.positions.join(' · ') : '' })
                  ]),
                  el('div', { class: 'btn-row' }, [
                    el('button', { class: 'btn sm ghost', text: '▲', disabled: idx === 0, onclick: function () { move(idx, -1); } }),
                    el('button', { class: 'btn sm ghost', text: '▼', disabled: idx === g.lineup.length - 1, onclick: function () { move(idx, 1); } }),
                    el('button', { class: 'btn sm danger', text: '✕', onclick: function () { g.lineup.splice(idx, 1); Store.saveGame(); render(); } })
                  ])
                ])
              ]));
            });
            b.appendChild(ol);
          } else {
            b.appendChild(el('p', { class: 'muted small mb', text: 'No batters in the order yet.' }));
          }

          // available
          var available = Store.activePlayers().filter(function (p) { return g.lineup.indexOf(p.id) === -1; })
            .sort(function (a, c) {
              var ai = g.attendance && g.attendance[a.id] === 'in' ? 0 : 1;
              var bi = g.attendance && g.attendance[c.id] === 'in' ? 0 : 1;
              if (ai !== bi) return ai - bi;
              return (a.name || '').localeCompare(c.name || '');
            });
          if (available.length) {
            b.appendChild(el('div', { class: 'divider' }));
            b.appendChild(el('p', { class: 'small gold mb', text: 'Add batter' }));
            var chips = el('div', { class: 'chips mb' });
            available.forEach(function (p) {
              var inGame = g.attendance && g.attendance[p.id] === 'in';
              chips.appendChild(el('button', {
                class: 'chip' + (inGame ? ' on' : ''),
                text: p.name + (p.number !== '' && p.number != null ? ' #' + p.number : ''),
                onclick: function () { g.lineup.push(p.id); Store.saveGame(); render(); }
              }));
            });
            b.appendChild(chips);
          }

          b.appendChild(el('button', { class: 'btn primary block mt', text: 'Done', onclick: function () { close(); App.refresh(); } }));
        }

        function move(idx, dir) {
          var ni = idx + dir;
          if (ni < 0 || ni >= g.lineup.length) return;
          var tmp = g.lineup[idx]; g.lineup[idx] = g.lineup[ni]; g.lineup[ni] = tmp;
          Store.saveGame(); render();
        }
      }
    });
  }

  function closeModal() { var m = document.querySelector('.modal-backdrop'); if (m) m.remove(); }

  global.Games = { render: render, editGame: editGame, lineupBuilder: lineupBuilder, gameDetail: gameDetail, boxScore: boxScore, lineScoreTable: lineScoreTable };
})(window);
