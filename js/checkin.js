/* checkin.js — per-game attendance for players and coaches */
(function (global) {
  'use strict';
  var el = U.el;
  var selectedGameId = null;

  function upcomingGames() {
    return Store.games().slice().sort(function (a, b) {
      return (a.date || '').localeCompare(b.date || '');
    });
  }

  function render(view) {
    var games = upcomingGames();

    view.appendChild(el('div', { class: 'view-head' }, [el('h2', { text: 'Check-In' })]));

    if (!games.length) {
      view.appendChild(el('p', { class: 'view-sub', text: 'Create a game on the Games tab, then players and coaches can check in here.' }));
      view.appendChild(U.emptyState('✅', 'No games scheduled', 'Add a game first.'));
      return;
    }

    // default to live game, else next non-final, else first
    if (!selectedGameId || !Store.getGame(selectedGameId)) {
      var live = Store.liveGame();
      var next = games.find(function (g) { return g.status !== 'final'; });
      selectedGameId = (live && live.id) || (next && next.id) || games[0].id;
    }

    var picker = el('select', { onchange: function (e) { selectedGameId = e.target.value; App.refresh(); } });
    games.forEach(function (g) {
      var label = U.fmtDate(g.date) + ' · ' + (g.homeAway === 'away' ? '@ ' : 'vs ') + (g.opponent || 'TBD') +
        (g.status === 'final' ? ' (final)' : g.status === 'live' ? ' (live)' : '');
      var opt = el('option', { value: g.id, text: label });
      if (g.id === selectedGameId) opt.selected = true;
      picker.appendChild(opt);
    });
    view.appendChild(el('label', { class: 'field' }, [el('span', { text: 'Game' }), picker]));

    var game = Store.getGame(selectedGameId);
    if (!game.attendance) game.attendance = {};

    var players = Store.activePlayers().slice().sort(byName);
    var coaches = Store.coaches().slice().sort(byName);

    // summary
    var counts = tally(game, players.concat(coaches));
    view.appendChild(el('div', { class: 'stat-strip mb' }, [
      Players.statBox(counts.in, 'In'),
      Players.statBox(counts.maybe, 'Maybe'),
      Players.statBox(counts.out, 'Out'),
      Players.statBox(counts.none, 'No reply')
    ]));

    view.appendChild(el('div', { class: 'btn-row mb' }, [
      el('button', { class: 'btn sm', text: 'All players In', onclick: function () { setAll(game, players, 'in'); } }),
      el('button', { class: 'btn sm ghost', text: 'Clear', onclick: function () { setAll(game, players.concat(coaches), null); } })
    ]));

    view.appendChild(sectionTitle('Players (' + players.length + ')'));
    var pl = el('div', { class: 'list' });
    if (!players.length) pl.appendChild(el('p', { class: 'muted small', text: 'No active players.' }));
    players.forEach(function (p) { pl.appendChild(personRow(game, p, 'player')); });
    view.appendChild(pl);

    view.appendChild(sectionTitle('Coaches (' + coaches.length + ')'));
    var cl = el('div', { class: 'list' });
    if (!coaches.length) cl.appendChild(el('p', { class: 'muted small', text: 'No coaches added.' }));
    coaches.forEach(function (c) { cl.appendChild(personRow(game, c, 'coach')); });
    view.appendChild(cl);
  }

  function personRow(game, person, kind) {
    var status = game.attendance[person.id] || null;
    var seg = el('div', { class: 'seg' });
    [['in', 'In'], ['maybe', 'Maybe'], ['out', 'Out']].forEach(function (o) {
      var on = status === o[0];
      seg.appendChild(el('button', {
        class: on ? 'on-' + o[0] : '',
        text: o[1],
        onclick: function () {
          game.attendance[person.id] = (status === o[0]) ? null : o[0];
          if (!game.attendance[person.id]) delete game.attendance[person.id];
          Store.saveGame();
          App.refresh();
        }
      }));
    });
    return el('div', { class: 'card' }, [
      el('div', { class: 'person' }, [
        el('div', { class: 'avatar', text: U.initials(person.name) }),
        el('div', { class: 'meta' }, [
          el('div', { class: 'name' }, [
            person.name,
            kind === 'player' && person.number !== '' && person.number != null ? el('span', { class: 'num-badge', text: '#' + person.number }) : null
          ]),
          el('div', { class: 'sub', text: kind === 'coach' ? (person.role || 'Coach') : (person.positions && person.positions.length ? person.positions.join(' · ') : 'Player') })
        ]),
        seg
      ])
    ]);
  }

  function tally(game, people) {
    var c = { in: 0, out: 0, maybe: 0, none: 0 };
    people.forEach(function (p) {
      var s = game.attendance[p.id];
      if (s === 'in') c.in++;
      else if (s === 'out') c.out++;
      else if (s === 'maybe') c.maybe++;
      else c.none++;
    });
    return c;
  }

  function setAll(game, people, status) {
    people.forEach(function (p) {
      if (status) game.attendance[p.id] = status;
      else delete game.attendance[p.id];
    });
    Store.saveGame();
    App.refresh();
  }

  function sectionTitle(t) { return el('h3', { class: 'mb', style: 'margin-top:6px;font-size:1rem;color:var(--gold-light)', text: t }); }
  function byName(a, b) { return (a.name || '').localeCompare(b.name || ''); }

  global.CheckIn = { render: render };
})(window);
