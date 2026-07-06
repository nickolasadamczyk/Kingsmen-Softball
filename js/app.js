/* app.js — router, tab navigation, bootstrap */
(function (global) {
  'use strict';
  var U = global.U;

  var TABS = {
    roster: Players,
    coaches: Coaches,
    checkin: CheckIn,
    games: Games,
    live: Live,
    stats: StatsView
  };

  var current = 'roster';
  var overlay = null; // {render: fn(view)} — a full-screen sub-view above the tabs

  function go(tab) {
    if (!TABS[tab]) tab = 'roster';
    overlay = null;
    current = tab;
    try { localStorage.setItem('kingsmen_tab', tab); } catch (e) {}
    refresh();
  }

  function openOverlay(renderFn) { overlay = { render: renderFn }; refresh(); }
  function closeOverlay() { overlay = null; refresh(); }

  function refresh() {
    var view = document.getElementById('view');
    U.clear(view);
    // live badge on tab
    updateTabs();
    try {
      (overlay ? overlay.render : TABS[current].render)(view);
    } catch (e) {
      console.error(e);
      view.appendChild(U.el('div', { class: 'empty' }, [
        U.el('div', { class: 'big', text: '⚠️' }),
        U.el('div', { html: '<strong>Something went wrong rendering this screen.</strong>' }),
        U.el('p', { class: 'small muted', text: String(e && e.message || e) })
      ]));
    }
    view.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function updateTabs() {
    var live = Store.liveGame();
    document.querySelectorAll('.tab').forEach(function (btn) {
      var tab = btn.getAttribute('data-tab');
      btn.classList.toggle('active', tab === current);
      // live indicator
      var ico = btn.querySelector('.tab-ico');
      if (tab === 'live' && live) {
        btn.style.color = 'var(--bad)';
      } else if (tab === 'live') {
        btn.style.color = '';
      }
    });
  }

  function applyTeam() {
    var team = Store.getTeam();
    document.getElementById('teamName').textContent = team.name || 'Kingsmen Softball';
    document.getElementById('teamTagline').textContent = team.tagline || 'Slow-Pitch Team Manager';
    document.title = team.name || 'Kingsmen Softball';
  }

  function init() {
    applyTeam();
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () { go(btn.getAttribute('data-tab')); });
    });
    document.getElementById('settingsBtn').addEventListener('click', function () { Settings.open(); });

    var saved = 'roster';
    try { saved = localStorage.getItem('kingsmen_tab') || 'roster'; } catch (e) {}
    // jump to live if a game is in progress
    if (Store.liveGame()) saved = 'live';
    go(saved);
  }

  global.App = { go: go, refresh: refresh, applyTeam: applyTeam, openOverlay: openOverlay, closeOverlay: closeOverlay };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
