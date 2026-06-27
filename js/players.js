/* players.js — roster CRUD + per-player metrics */
(function (global) {
  'use strict';
  var el = U.el;

  var POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LCF', 'RCF', 'RF', 'EH'];

  function render(view) {
    var players = Store.players().slice().sort(function (a, b) {
      return (a.name || '').localeCompare(b.name || '');
    });

    view.appendChild(el('div', { class: 'view-head' }, [
      el('h2', { text: 'Roster' }),
      el('button', { class: 'btn primary sm', text: '+ Add Player', onclick: function () { editPlayer(null); } })
    ]));
    view.appendChild(el('p', { class: 'view-sub', text: players.length + ' player' + (players.length === 1 ? '' : 's') + ' · tap a player for stats' }));

    if (!players.length) {
      view.appendChild(U.emptyState('👥', 'No players yet', 'Add your team roster to get started.'));
      return;
    }

    var totals = Stats.seasonByPlayer();
    var list = el('div', { class: 'list' });
    players.forEach(function (p) {
      var line = totals[p.id] || Stats.blankLine();
      var d = Stats.derive(line);
      var card = el('div', { class: 'card tap', onclick: function () { playerDetail(p.id); } }, [
        el('div', { class: 'person' }, [
          el('div', { class: 'avatar', text: U.initials(p.name) }),
          el('div', { class: 'meta' }, [
            el('div', { class: 'name' }, [
              p.name,
              p.number !== '' && p.number != null ? el('span', { class: 'num-badge', text: '#' + p.number }) : null,
              p.active === false ? el('span', { class: 'pill out', text: 'Inactive' }) : null
            ]),
            el('div', { class: 'sub', text: (p.positions && p.positions.length ? p.positions.join(' · ') : 'No position') + (p.bats ? '  ·  Bats ' + p.bats : '') })
          ]),
          el('div', { class: 'center' }, [
            el('div', { class: 'gold', html: '<strong>' + U.avg3(d.avg) + '</strong>' }),
            el('div', { class: 'tiny muted', text: 'AVG' })
          ])
        ])
      ]);
      list.appendChild(card);
    });
    view.appendChild(list);
  }

  function editPlayer(id) {
    var p = id ? Store.getPlayer(id) : { name: '', number: '', positions: [], gender: '', bats: '', throws: '', active: true };
    var sel = (p.positions || []).slice();

    U.modal({
      title: id ? 'Edit Player' : 'Add Player',
      body: function (b, close) {
        var name = field('Name', 'text', p.name);
        var number = field('Jersey #', 'text', p.number);
        var genderSel = selectField('Division', p.gender, ['', 'M', 'F'], ['—', 'Male', 'Female']);
        var batsSel = selectField('Bats', p.bats, ['', 'R', 'L', 'S'], ['—', 'Right', 'Left', 'Switch']);
        var throwsSel = selectField('Throws', p.throws, ['', 'R', 'L'], ['—', 'Right', 'Left']);

        var posWrap = el('div', { class: 'chips mb' });
        POSITIONS.forEach(function (pos) {
          var chip = el('button', {
            type: 'button',
            class: 'chip' + (sel.indexOf(pos) > -1 ? ' on' : ''),
            text: pos,
            onclick: function () {
              var i = sel.indexOf(pos);
              if (i > -1) sel.splice(i, 1); else sel.push(pos);
              chip.classList.toggle('on');
            }
          });
          posWrap.appendChild(chip);
        });

        var activeSelect = el('select');
        [['true', 'Active'], ['false', 'Inactive']].forEach(function (o) {
          var opt = el('option', { value: o[0], text: o[1] });
          if (String(p.active !== false) === o[0]) opt.selected = true;
          activeSelect.appendChild(opt);
        });
        var activeWrap = el('label', { class: 'field' }, [
          el('span', { text: 'Status' }),
          activeSelect
        ]);

        b.appendChild(name.wrap);
        b.appendChild(el('div', { class: 'grid-2' }, [number.wrap, genderSel.wrap]));
        b.appendChild(el('label', { class: 'field' }, [el('span', { text: 'Positions' })]));
        b.appendChild(posWrap);
        b.appendChild(el('div', { class: 'grid-2' }, [batsSel.wrap, throwsSel.wrap]));
        b.appendChild(activeWrap);

        b.appendChild(el('div', { class: 'btn-row mt' }, [
          el('button', { class: 'btn primary block', text: id ? 'Save' : 'Add Player', onclick: function () {
            var nm = name.input.value.trim();
            if (!nm) { U.toast('Name is required'); return; }
            var patch = {
              name: nm,
              number: number.input.value.trim(),
              positions: sel,
              gender: genderSel.input.value,
              bats: batsSel.input.value,
              throws: throwsSel.input.value,
              active: activeSelect.value === 'true'
            };
            if (id) Store.updatePlayer(id, patch);
            else Store.addPlayer(patch);
            close();
            App.refresh();
            U.toast('Saved');
          }}),
          id ? el('button', { class: 'btn danger', text: 'Delete', onclick: function () {
            U.confirm('Delete ' + p.name + '? Their recorded game stats stay with past games.', function () {
              Store.removePlayer(id);
              close();
              App.refresh();
            }, { danger: true, yesText: 'Delete' });
          }}) : null
        ]));
      }
    });
  }

  function playerDetail(id) {
    var p = Store.getPlayer(id);
    if (!p) return;
    var totals = Stats.seasonByPlayer()[id] || Stats.blankLine();
    var d = Stats.derive(totals);

    U.modal({
      title: p.name + (p.number !== '' && p.number != null ? '  #' + p.number : ''),
      body: function (b) {
        b.appendChild(el('div', { class: 'small muted mb', text:
          [p.positions && p.positions.length ? p.positions.join(' · ') : null,
           p.bats ? 'Bats ' + p.bats : null,
           p.throws ? 'Throws ' + p.throws : null,
           p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : null
          ].filter(Boolean).join('   ·   ') || 'No details' }));

        b.appendChild(el('div', { class: 'stat-strip mb' }, [
          statBox(U.avg3(d.avg), 'AVG'),
          statBox(U.avg3(d.obp), 'OBP'),
          statBox(U.avg3(d.slg), 'SLG'),
          statBox(U.avg3(d.ops), 'OPS')
        ]));

        b.appendChild(el('div', { class: 'stat-strip mb' }, [
          statBox(totals.gp, 'GP'),
          statBox(totals.h, 'H'),
          statBox(totals.hr, 'HR'),
          statBox(totals.rbi, 'RBI'),
          statBox(totals.r, 'R')
        ]));

        var rows = [
          ['Plate Appearances', totals.pa],
          ['At Bats', totals.ab],
          ['Hits', totals.h],
          ['Singles / Doubles / Triples', totals.b1 + ' / ' + totals.b2 + ' / ' + totals.b3],
          ['Home Runs', totals.hr],
          ['Total Bases', d.tb],
          ['Runs / RBI', totals.r + ' / ' + totals.rbi],
          ['Walks', totals.bb],
          ['Strikeouts', totals.k],
          ['Sac Flies', totals.sf],
          ['Reached on Error', totals.roe]
        ];
        var tbl = el('table', { class: 'stats', style: 'width:100%' });
        rows.forEach(function (r) {
          tbl.appendChild(el('tr', null, [
            el('td', { text: r[0], style: 'text-align:left' }),
            el('td', { text: String(r[1]), class: 'hl' })
          ]));
        });
        b.appendChild(el('div', { class: 'table-wrap mb' }, tbl));

        b.appendChild(el('div', { class: 'btn-row' }, [
          el('button', { class: 'btn primary', text: 'Edit', onclick: function () {
            document.querySelector('.modal-backdrop').remove();
            editPlayer(id);
          }})
        ]));
        b.appendChild(el('p', { class: 'fab-note', text: 'Season stats are totaled from completed games.' }));
      }
    });
  }

  function statBox(v, k) {
    return el('div', { class: 'stat-box' }, [
      el('div', { class: 'v', text: String(v) }),
      el('div', { class: 'k', text: k })
    ]);
  }

  function field(label, type, value) {
    var input = el('input', { type: type || 'text', value: value == null ? '' : value });
    var wrap = el('label', { class: 'field' }, [el('span', { text: label }), input]);
    return { wrap: wrap, input: input };
  }
  function selectField(label, value, values, labels) {
    var input = el('select');
    values.forEach(function (v, i) {
      var opt = el('option', { value: v, text: labels[i] });
      if (v === value) opt.selected = true;
      input.appendChild(opt);
    });
    var wrap = el('label', { class: 'field' }, [el('span', { text: label }), input]);
    return { wrap: wrap, input: input };
  }

  global.Players = { render: render, editPlayer: editPlayer, POSITIONS: POSITIONS, field: field, selectField: selectField, statBox: statBox };
})(window);
