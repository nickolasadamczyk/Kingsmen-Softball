/* statsview.js — season leaderboards + sortable team batting table */
(function (global) {
  'use strict';
  var el = U.el;
  var sortKey = 'avg';
  var minPA = 1;

  function render(view) {
    view.appendChild(el('div', { class: 'view-head' }, [el('h2', { text: 'Stats' })]));

    var totals = Stats.seasonByPlayer();
    var pids = Object.keys(totals);
    var finalGames = Store.games().filter(function (g) { return g.status === 'final'; }).length;

    if (!pids.length) {
      view.appendChild(el('p', { class: 'view-sub', text: 'Season totals appear here after you finish games.' }));
      view.appendChild(U.emptyState('📊', 'No stats yet', 'Play and finish a game to build season stats.'));
      return;
    }

    var rec = Stats.teamRecord();
    view.appendChild(el('div', { class: 'stat-strip mb' }, [
      Players.statBox(rec.w + '-' + rec.l + (rec.t ? '-' + rec.t : ''), 'Record'),
      Players.statBox(finalGames, 'Games')
    ]));

    // team totals
    var team = Stats.blankLine();
    pids.forEach(function (pid) { team = Stats.addLines(team, totals[pid]); });
    var td = Stats.derive(team);
    view.appendChild(el('div', { class: 'card' }, [
      el('strong', { class: 'mb', text: 'Team Batting' }),
      el('div', { class: 'stat-strip mt' }, [
        Players.statBox(U.avg3(td.avg), 'AVG'),
        Players.statBox(U.avg3(td.obp), 'OBP'),
        Players.statBox(U.avg3(td.ops), 'OPS'),
        Players.statBox(team.r, 'Runs'),
        Players.statBox(team.hr, 'HR')
      ])
    ]));

    // leaders
    view.appendChild(leaderCard('Leaders', totals));

    // sortable table
    var cols = [
      { k: 'name', label: 'Batter' }, { k: 'gp', label: 'GP' }, { k: 'pa', label: 'PA' }, { k: 'ab', label: 'AB' },
      { k: 'r', label: 'R' }, { k: 'h', label: 'H' }, { k: 'b2', label: '2B' }, { k: 'b3', label: '3B' },
      { k: 'hr', label: 'HR' }, { k: 'rbi', label: 'RBI' }, { k: 'bb', label: 'BB' }, { k: 'k', label: 'K' },
      { k: 'avg', label: 'AVG' }, { k: 'obp', label: 'OBP' }, { k: 'slg', label: 'SLG' }, { k: 'ops', label: 'OPS' }
    ];

    var rows = pids.map(function (pid) {
      var p = Store.getPlayer(pid);
      var line = totals[pid];
      var d = Stats.derive(line);
      return { pid: pid, name: p ? p.name : 'Unknown', line: line, d: d };
    }).filter(function (r) { return r.line.pa >= minPA; });

    rows.sort(function (a, b) {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      var av = val(a, sortKey), bv = val(b, sortKey);
      return bv - av;
    });

    view.appendChild(el('div', { class: 'row-between mb mt' }, [
      el('strong', { text: 'Full Batting Stats' }),
      el('span', { class: 'tiny muted', text: 'Tap a column to sort' })
    ]));

    var table = el('table', { class: 'stats' });
    var head = el('tr');
    cols.forEach(function (c) {
      head.appendChild(el('th', {
        text: c.label + (sortKey === c.k ? ' ▾' : ''),
        style: 'cursor:pointer',
        onclick: function () { sortKey = c.k; App.refresh(); }
      }));
    });
    table.appendChild(head);

    rows.forEach(function (r) {
      var tr = el('tr');
      cols.forEach(function (c) {
        if (c.k === 'name') tr.appendChild(el('td', { text: r.name }));
        else if (['avg', 'obp', 'slg', 'ops'].indexOf(c.k) > -1) tr.appendChild(el('td', { class: sortKey === c.k ? 'hl' : '', text: U.avg3(r.d[c.k]) }));
        else tr.appendChild(el('td', { class: sortKey === c.k ? 'hl' : '', text: String(r.line[c.k] || 0) }));
      });
      table.appendChild(tr);
    });
    view.appendChild(el('div', { class: 'table-wrap' }, table));
    view.appendChild(el('p', { class: 'fab-note', text: 'Rate stats (AVG/OBP/SLG/OPS) follow standard softball formulas.' }));
  }

  function val(r, k) {
    if (['avg', 'obp', 'slg', 'ops', 'tb'].indexOf(k) > -1) return r.d[k] || 0;
    return r.line[k] || 0;
  }

  function leaderCard(title, totals) {
    var cats = [
      { k: 'avg', label: 'AVG', rate: true, minPa: 3 },
      { k: 'hr', label: 'Home Runs' },
      { k: 'rbi', label: 'RBI' },
      { k: 'h', label: 'Hits' },
      { k: 'ops', label: 'OPS', rate: true, minPa: 3 }
    ];
    var wrap = el('div', { class: 'card' }, [el('strong', { class: 'mb', text: title })]);
    cats.forEach(function (cat) {
      var best = null;
      Object.keys(totals).forEach(function (pid) {
        var line = totals[pid];
        var d = Stats.derive(line);
        if (cat.rate && line.pa < (cat.minPa || 1)) return;
        var v = cat.rate ? d[cat.k] : line[cat.k];
        if (best === null || v > best.v) best = { pid: pid, v: v };
      });
      if (!best || best.v <= 0) return;
      var p = Store.getPlayer(best.pid);
      wrap.appendChild(el('div', { class: 'row-between', style: 'padding:6px 0;border-top:1px solid var(--line)' }, [
        el('span', { class: 'muted small', text: cat.label }),
        el('span', null, [
          el('strong', { class: 'gold', text: cat.rate ? U.avg3(best.v) : String(best.v) }),
          el('span', { class: 'small muted', text: '  ' + (p ? p.name : 'Unknown') })
        ])
      ]));
    });
    return wrap;
  }

  global.StatsView = { render: render };
})(window);
