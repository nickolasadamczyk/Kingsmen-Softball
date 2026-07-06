/* summary.js — post-game dashboard: result, line score, box score, highlights, share */
(function (global) {
  'use strict';
  var el = U.el;

  function open(gameId) {
    App.openOverlay(function (view) { render(view, gameId); });
  }

  function render(view, gameId) {
    var g = Store.getGame(gameId);
    if (!g) { view.appendChild(U.emptyState('❓', 'Game not found', '')); return; }

    var us = Stats.totalRuns(g, 'us');
    var them = Stats.totalRuns(g, 'them');
    var isFinal = g.status === 'final';
    var cls = us > them ? 'win' : us < them ? 'loss' : 'tie';
    var word = us > them ? 'Win' : us < them ? 'Loss' : 'Tie';

    // Header / back
    view.appendChild(el('div', { class: 'view-head' }, [
      el('button', { class: 'btn ghost sm', text: '‹ Back', onclick: function () { App.go('games'); } }),
      el('button', { class: 'btn sm', text: '📋 Copy', onclick: function () { copySummary(g); } })
    ]));

    // Result banner
    view.appendChild(el('div', { class: 'scoreboard mb' }, [
      el('div', { class: 'center mb', html: '<span class="pill ' + (isFinal ? cls : 'live') + '">' + (isFinal ? word.toUpperCase() : 'IN PROGRESS') + '</span>' }),
      el('div', { class: 'score-main' }, [
        el('div', null, [el('div', { class: 'score-team', text: 'Kingsmen' }), el('div', { class: 'score-num', text: String(us) })]),
        el('div', { class: 'score-vs', text: 'vs' }),
        el('div', null, [el('div', { class: 'score-team', text: g.opponent || 'Opponent' }), el('div', { class: 'score-num', text: String(them) })])
      ]),
      el('div', { class: 'inning-tag', text: U.fmtDateTime(g.date) + (g.location ? '  ·  ' + g.location : '') + '  ·  ' + (g.homeAway === 'away' ? 'Away' : 'Home') })
    ]));

    // Line score
    view.appendChild(sectionTitle('Line Score'));
    view.appendChild(Games.lineScoreTable(g));

    // Highlights
    var hi = highlights(g);
    if (hi.length) {
      view.appendChild(sectionTitle('Highlights'));
      var list = el('div', { class: 'card' });
      hi.forEach(function (h, i) {
        list.appendChild(el('div', { class: 'row-between', style: (i ? 'border-top:1px solid var(--line);' : '') + 'padding:8px 0' }, [
          el('span', null, [el('strong', { text: h.name }), h.pos ? el('span', { class: 'tiny muted', text: '  ' + h.pos }) : null]),
          el('span', { class: 'gold', text: h.line })
        ]));
      });
      view.appendChild(list);
    }

    // Box score
    view.appendChild(sectionTitle('Box Score'));
    var totals = teamTotals(g);
    var td = Stats.derive(totals);
    view.appendChild(el('div', { class: 'stat-strip mb' }, [
      Players.statBox(totals.h, 'Hits'),
      Players.statBox(totals.hr, 'HR'),
      Players.statBox(totals.rbi, 'RBI'),
      Players.statBox(U.avg3(td.avg), 'AVG')
    ]));
    view.appendChild(Games.boxScore(g));

    // Positions (if set)
    if (g.positions && Object.keys(g.positions).some(function (k) { return g.positions[k]; })) {
      view.appendChild(sectionTitle('Field Positions'));
      view.appendChild(el('div', { class: 'card' }, [Games.positionsSummary(g)]));
    }

    view.appendChild(el('button', { class: 'btn primary block mt', text: '📋 Copy Summary to Share', onclick: function () { copySummary(g); } }));
    view.appendChild(el('p', { class: 'fab-note', text: 'Tip: paste the copied summary into your team chat or a text message.' }));
  }

  function sectionTitle(t) { return el('h3', { class: 'mb', style: 'margin-top:8px;font-size:1rem;color:var(--gold-light)', text: t }); }

  function teamTotals(g) {
    var t = Stats.blankLine();
    Object.keys(g.stats || {}).forEach(function (pid) { if (g.stats[pid].pa > 0) t = Stats.addLines(t, g.stats[pid]); });
    return t;
  }

  function orderedBatters(g) {
    var pids = Object.keys(g.stats || {}).filter(function (pid) { return g.stats[pid].pa > 0; });
    if (g.lineup && g.lineup.length) {
      pids.sort(function (a, b) {
        var ia = g.lineup.indexOf(a), ib = g.lineup.indexOf(b);
        if (ia === -1) ia = 999; if (ib === -1) ib = 999;
        return ia - ib;
      });
    }
    return pids;
  }

  function highlights(g) {
    var pids = Object.keys(g.stats || {}).filter(function (pid) { return g.stats[pid].pa > 0; });
    var rows = pids.map(function (pid) {
      var s = g.stats[pid];
      var p = Store.getPlayer(pid);
      var d = Stats.derive(s);
      return { pid: pid, s: s, name: p ? p.name : 'Unknown', tb: d.tb };
    });
    // notable: 2+ hits, or a HR, or 2+ RBI
    rows = rows.filter(function (r) { return r.s.h >= 2 || r.s.hr >= 1 || r.s.rbi >= 2; });
    rows.sort(function (a, b) { return (b.s.hr - a.s.hr) || (b.tb - a.tb) || (b.s.h - a.s.h) || (b.s.rbi - a.s.rbi); });
    return rows.slice(0, 4).map(function (r) { return { name: r.name, line: batLine(r.s) }; });
  }

  // "2-3, HR, 2 RBI"
  function batLine(s) {
    var parts = [s.h + '-' + s.ab];
    var xbh = [];
    if (s.b2) xbh.push(s.b2 + ' 2B');
    if (s.b3) xbh.push(s.b3 + ' 3B');
    if (s.hr) xbh.push(s.hr + ' HR');
    if (xbh.length) parts.push(xbh.join(', '));
    if (s.rbi) parts.push(s.rbi + ' RBI');
    if (s.r) parts.push(s.r + ' R');
    if (s.bb) parts.push(s.bb + ' BB');
    return parts.join(', ');
  }

  /* ---- shareable plain-text summary ---- */
  function buildText(g) {
    var us = Stats.totalRuns(g, 'us');
    var them = Stats.totalRuns(g, 'them');
    var res = us > them ? 'W' : us < them ? 'L' : 'T';
    var team = Store.getTeam().name || 'Kingsmen';
    var lines = [];
    lines.push(team + ' ' + (g.homeAway === 'away' ? '@' : 'vs') + ' ' + (g.opponent || 'Opponent') + ' — ' + U.fmtDate(g.date));
    lines.push((g.status === 'final' ? 'Final' : 'Score') + ': ' + team + ' ' + us + ', ' + (g.opponent || 'Opp') + ' ' + them + ' (' + res + ')');
    lines.push('');

    // line score
    var innings = g.innings || [];
    var header = '        ' + innings.map(function (_, i) { return pad(i + 1, 2); }).join(' ') + '  R';
    lines.push(header);
    ['us', 'them'].forEach(function (side) {
      var label = side === 'us' ? team : (g.opponent || 'Opp');
      var tot = 0;
      var cells = innings.map(function (inn) { var v = inn[side] || 0; tot += v; return pad(v, 2); });
      lines.push(padRight(label.slice(0, 8), 8) + cells.join(' ') + '  ' + tot);
    });
    lines.push('');

    // batting
    lines.push('Batting:');
    orderedBatters(g).forEach(function (pid) {
      var p = Store.getPlayer(pid);
      lines.push('  ' + padRight((p ? p.name : 'Unknown').slice(0, 14), 15) + batLine(g.stats[pid]));
    });
    return lines.join('\n');
  }

  function pad(v, n) { var s = String(v); while (s.length < n) s = ' ' + s; return s; }
  function padRight(v, n) { var s = String(v); while (s.length < n) s = s + ' '; return s; }

  function copySummary(g) {
    var text = buildText(g);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { U.toast('Summary copied'); }, function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = el('textarea', { style: 'position:fixed;left:-9999px;top:0' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); U.toast('Summary copied'); }
    catch (e) { U.toast('Copy not supported — long-press to select'); }
    ta.remove();
  }

  global.Summary = { open: open, render: render, buildText: buildText };
})(window);
