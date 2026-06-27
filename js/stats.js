/* stats.js — batting stat math + season aggregation */
(function (global) {
  'use strict';

  // A blank stat line for one game (or accumulator)
  function blankLine() {
    return {
      gp: 0,  // games played (with at least 1 PA)
      pa: 0,  // plate appearances
      ab: 0,  // at bats
      r: 0,   // runs scored
      h: 0,   // hits (1b+2b+3b+hr)
      b1: 0,  // singles
      b2: 0,  // doubles
      b3: 0,  // triples
      hr: 0,  // home runs
      rbi: 0, // runs batted in
      bb: 0,  // walks
      k: 0,   // strikeouts
      sf: 0,  // sacrifice flies
      roe: 0, // reached on error
      fc: 0   // fielder's choice
    };
  }

  // Apply a single at-bat outcome to a line. Returns the line.
  // outcome: one of the OUTCOMES keys below. rbi/runScored optional.
  var OUTCOMES = {
    '1B': { label: 'Single', h: 1, b1: 1, ab: 1, pa: 1 },
    '2B': { label: 'Double', h: 1, b2: 1, ab: 1, pa: 1 },
    '3B': { label: 'Triple', h: 1, b3: 1, ab: 1, pa: 1 },
    'HR': { label: 'Home Run', h: 1, hr: 1, ab: 1, pa: 1 },
    'BB': { label: 'Walk', bb: 1, pa: 1 },          // not an AB
    'SF': { label: 'Sac Fly', sf: 1, pa: 1 },        // not an AB
    'OUT': { label: 'Out', ab: 1, pa: 1 },
    'K': { label: 'Strikeout', k: 1, ab: 1, pa: 1 },
    'FC': { label: "Fielder's Choice", fc: 1, ab: 1, pa: 1 },
    'ROE': { label: 'Reached on Error', roe: 1, ab: 1, pa: 1 }
  };

  function applyOutcome(line, code, rbi) {
    var o = OUTCOMES[code];
    if (!o) return line;
    Object.keys(o).forEach(function (k) {
      if (k === 'label') return;
      line[k] = (line[k] || 0) + o[k];
    });
    if (rbi) line.rbi += rbi;
    return line;
  }

  function addLines(a, b) {
    var out = blankLine();
    Object.keys(out).forEach(function (k) { out[k] = (a[k] || 0) + (b[k] || 0); });
    return out;
  }

  // Derived rates
  function derive(line) {
    var ab = line.ab || 0;
    var h = line.h || 0;
    var bb = line.bb || 0;
    var sf = line.sf || 0;
    var hbp = 0; // not tracked separately for slow pitch
    var tb = (line.b1 || 0) + 2 * (line.b2 || 0) + 3 * (line.b3 || 0) + 4 * (line.hr || 0);
    var avg = ab > 0 ? h / ab : 0;
    var obpDen = ab + bb + sf + hbp;
    var obp = obpDen > 0 ? (h + bb + hbp) / obpDen : 0;
    var slg = ab > 0 ? tb / ab : 0;
    return {
      avg: avg,
      obp: obp,
      slg: slg,
      ops: obp + slg,
      tb: tb
    };
  }

  // Season totals per player across all FINAL games
  function seasonByPlayer() {
    var totals = {}; // playerId -> line
    Store.games().forEach(function (g) {
      if (g.status !== 'final') return;
      if (!g.stats) return;
      Object.keys(g.stats).forEach(function (pid) {
        var line = g.stats[pid];
        if (!totals[pid]) totals[pid] = blankLine();
        var merged = addLines(totals[pid], line);
        // count game played if any PA
        merged.gp = totals[pid].gp + (line.pa > 0 ? 1 : 0);
        totals[pid] = merged;
      });
    });
    return totals;
  }

  function teamRecord() {
    var w = 0, l = 0, t = 0;
    Store.games().forEach(function (g) {
      if (g.status !== 'final') return;
      var us = totalRuns(g, 'us');
      var them = totalRuns(g, 'them');
      if (us > them) w++;
      else if (us < them) l++;
      else t++;
    });
    return { w: w, l: l, t: t };
  }

  function totalRuns(game, side) {
    if (!game.innings) return 0;
    return game.innings.reduce(function (sum, inn) { return sum + (inn[side] || 0); }, 0);
  }

  global.Stats = {
    blankLine: blankLine,
    OUTCOMES: OUTCOMES,
    applyOutcome: applyOutcome,
    addLines: addLines,
    derive: derive,
    seasonByPlayer: seasonByPlayer,
    teamRecord: teamRecord,
    totalRuns: totalRuns
  };
})(window);
