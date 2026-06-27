/* coaches.js — coaching staff CRUD */
(function (global) {
  'use strict';
  var el = U.el;

  var ROLES = ['Head Coach', 'Assistant Coach', 'Manager', 'Scorekeeper', 'Bench Coach'];

  function render(view) {
    var coaches = Store.coaches().slice();

    view.appendChild(el('div', { class: 'view-head' }, [
      el('h2', { text: 'Coaches' }),
      el('button', { class: 'btn primary sm', text: '+ Add Coach', onclick: function () { editCoach(null); } })
    ]));
    view.appendChild(el('p', { class: 'view-sub', text: 'Coaching staff. They check in for games on the Check-In tab.' }));

    if (!coaches.length) {
      view.appendChild(U.emptyState('📋', 'No coaches yet', 'Add coaches and staff here.'));
      return;
    }

    var list = el('div', { class: 'list' });
    coaches.forEach(function (c) {
      list.appendChild(el('div', { class: 'card tap', onclick: function () { editCoach(c.id); } }, [
        el('div', { class: 'person' }, [
          el('div', { class: 'avatar', text: U.initials(c.name) }),
          el('div', { class: 'meta' }, [
            el('div', { class: 'name', text: c.name }),
            el('div', { class: 'sub', text: [c.role, c.phone, c.email].filter(Boolean).join('  ·  ') || 'No details' })
          ]),
          el('div', { class: 'muted', text: '›' })
        ])
      ]));
    });
    view.appendChild(list);
  }

  function editCoach(id) {
    var c = id ? Store.getCoach(id) : { name: '', role: 'Assistant Coach', phone: '', email: '' };
    U.modal({
      title: id ? 'Edit Coach' : 'Add Coach',
      body: function (b, close) {
        var name = Players.field('Name', 'text', c.name);
        var roleSel = Players.selectField('Role', c.role, ROLES, ROLES);
        var phone = Players.field('Phone', 'tel', c.phone);
        var email = Players.field('Email', 'email', c.email);

        b.appendChild(name.wrap);
        b.appendChild(roleSel.wrap);
        b.appendChild(el('div', { class: 'grid-2' }, [phone.wrap, email.wrap]));

        b.appendChild(el('div', { class: 'btn-row mt' }, [
          el('button', { class: 'btn primary block', text: id ? 'Save' : 'Add Coach', onclick: function () {
            var nm = name.input.value.trim();
            if (!nm) { U.toast('Name is required'); return; }
            var patch = { name: nm, role: roleSel.input.value, phone: phone.input.value.trim(), email: email.input.value.trim() };
            if (id) Store.updateCoach(id, patch); else Store.addCoach(patch);
            close(); App.refresh(); U.toast('Saved');
          }}),
          id ? el('button', { class: 'btn danger', text: 'Delete', onclick: function () {
            U.confirm('Delete ' + c.name + '?', function () { Store.removeCoach(id); close(); App.refresh(); }, { danger: true, yesText: 'Delete' });
          }}) : null
        ]));
      }
    });
  }

  global.Coaches = { render: render };
})(window);
