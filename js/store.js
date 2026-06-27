/* store.js — persistence layer (localStorage) + central app state */
(function (global) {
  'use strict';

  var KEY = 'kingsmen_softball_v1';

  var DEFAULT_DATA = {
    version: 1,
    team: {
      name: 'Kingsmen Softball',
      tagline: 'Slow-Pitch Team Manager',
      season: '2026'
    },
    players: [],   // {id,name,number,positions[],gender,bats,throws,active}
    coaches: [],   // {id,name,role,phone,email}
    games: []      // see games.js for shape
  };

  function uid(prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 8);
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT_DATA);
      var parsed = JSON.parse(raw);
      // shallow-merge defaults so new fields don't break old saves
      return Object.assign(clone(DEFAULT_DATA), parsed, {
        team: Object.assign(clone(DEFAULT_DATA.team), parsed.team || {})
      });
    } catch (e) {
      console.warn('Failed to load data, starting fresh', e);
      return clone(DEFAULT_DATA);
    }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var data = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      alert('Could not save data — storage may be full or disabled.');
      console.error(e);
    }
  }

  var Store = {
    uid: uid,
    clone: clone,
    get data() { return data; },

    /* ---- team ---- */
    getTeam: function () { return data.team; },
    updateTeam: function (patch) { Object.assign(data.team, patch); save(); },

    /* ---- players ---- */
    players: function () { return data.players; },
    activePlayers: function () { return data.players.filter(function (p) { return p.active !== false; }); },
    getPlayer: function (id) { return data.players.find(function (p) { return p.id === id; }); },
    addPlayer: function (p) {
      p.id = uid('p');
      if (p.active === undefined) p.active = true;
      data.players.push(p);
      save();
      return p;
    },
    updatePlayer: function (id, patch) {
      var p = this.getPlayer(id);
      if (p) { Object.assign(p, patch); save(); }
      return p;
    },
    removePlayer: function (id) {
      data.players = data.players.filter(function (p) { return p.id !== id; });
      save();
    },

    /* ---- coaches ---- */
    coaches: function () { return data.coaches; },
    getCoach: function (id) { return data.coaches.find(function (c) { return c.id === id; }); },
    addCoach: function (c) { c.id = uid('c'); data.coaches.push(c); save(); return c; },
    updateCoach: function (id, patch) {
      var c = this.getCoach(id);
      if (c) { Object.assign(c, patch); save(); }
      return c;
    },
    removeCoach: function (id) {
      data.coaches = data.coaches.filter(function (c) { return c.id !== id; });
      save();
    },

    /* ---- games ---- */
    games: function () { return data.games; },
    getGame: function (id) { return data.games.find(function (g) { return g.id === id; }); },
    addGame: function (g) { g.id = uid('g'); data.games.push(g); save(); return g; },
    updateGame: function (id, patch) {
      var g = this.getGame(id);
      if (g) { Object.assign(g, patch); save(); }
      return g;
    },
    saveGame: function () { save(); }, // for in-place mutation of a game object
    removeGame: function (id) {
      data.games = data.games.filter(function (g) { return g.id !== id; });
      save();
    },
    liveGame: function () {
      return data.games.find(function (g) { return g.status === 'live'; });
    },

    save: save,

    /* ---- backup / restore ---- */
    exportJSON: function () { return JSON.stringify(data, null, 2); },
    importJSON: function (json) {
      var incoming = JSON.parse(json);
      if (!incoming || !Array.isArray(incoming.players)) {
        throw new Error('That file does not look like a Kingsmen Softball backup.');
      }
      data = Object.assign(clone(DEFAULT_DATA), incoming, {
        team: Object.assign(clone(DEFAULT_DATA.team), incoming.team || {})
      });
      save();
    },
    resetAll: function () { data = clone(DEFAULT_DATA); save(); }
  };

  global.Store = Store;
})(window);
