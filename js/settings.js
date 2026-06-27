/* settings.js — team info, backup/restore, reset */
(function (global) {
  'use strict';
  var el = U.el;

  function open() {
    var team = Store.getTeam();
    U.modal({
      title: 'Settings',
      body: function (b, close) {
        var name = Players.field('Team Name', 'text', team.name);
        var tagline = Players.field('Tagline', 'text', team.tagline);
        var season = Players.field('Season', 'text', team.season);

        b.appendChild(name.wrap);
        b.appendChild(el('div', { class: 'grid-2' }, [tagline.wrap, season.wrap]));
        b.appendChild(el('button', { class: 'btn primary block', text: 'Save Team Info', onclick: function () {
          Store.updateTeam({ name: name.input.value.trim() || 'Kingsmen Softball', tagline: tagline.input.value.trim(), season: season.input.value.trim() });
          App.applyTeam(); App.refresh(); U.toast('Saved');
        }}));

        b.appendChild(el('div', { class: 'divider' }));
        b.appendChild(el('strong', { text: 'Backup & Restore' }));
        b.appendChild(el('p', { class: 'small muted mb', text: 'All data is stored on this device only. Export a backup to keep it safe or move it to another phone.' }));
        b.appendChild(el('div', { class: 'btn-row mb' }, [
          el('button', { class: 'btn green', text: '⬇ Export Backup', onclick: exportBackup }),
          el('button', { class: 'btn', text: '⬆ Import Backup', onclick: function () { importBackup(close); } })
        ]));

        b.appendChild(el('div', { class: 'divider' }));
        b.appendChild(el('button', { class: 'btn danger block', text: 'Reset All Data', onclick: function () {
          U.confirm('Erase EVERYTHING — players, coaches, games and stats? This cannot be undone. Export a backup first if unsure.', function () {
            Store.resetAll(); close(); App.applyTeam(); App.refresh(); U.toast('All data reset');
          }, { danger: true, yesText: 'Erase Everything' });
        }}));

        b.appendChild(el('p', { class: 'fab-note', text: 'Kingsmen Softball · works offline · add to Home Screen to use like an app.' }));
      }
    });
  }

  function exportBackup() {
    var json = Store.exportJSON();
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: 'kingsmen-softball-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    U.toast('Backup downloaded');
  }

  function importBackup(close) {
    var input = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          Store.importJSON(reader.result);
          if (close) close();
          App.applyTeam(); App.refresh();
          U.toast('Backup restored');
        } catch (e) {
          U.toast(e.message || 'Could not import that file');
        }
      };
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(function () { input.remove(); }, 1000);
  }

  global.Settings = { open: open };
})(window);
