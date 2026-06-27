/* utils.js — DOM helpers, formatting, modal, toast */
(function (global) {
  'use strict';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    if (children === null || children === undefined) return;
    if (Array.isArray(children)) {
      children.forEach(function (c) { appendChildren(node, c); });
    } else if (typeof children === 'string' || typeof children === 'number') {
      node.appendChild(document.createTextNode(String(children)));
    } else if (children instanceof Node) {
      node.appendChild(children);
    }
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function fmtDate(iso) {
    if (!iso) return 'TBD';
    var d = new Date(iso + (iso.length === 10 ? 'T00:00' : ''));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function fmtDateTime(iso) {
    if (!iso) return 'TBD';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function todayISO() {
    var d = new Date();
    var off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  }

  /* batting-average style: .000, 1.000 */
  function avg3(n) {
    if (!isFinite(n)) return '.000';
    var s = n.toFixed(3);
    return n < 1 ? s.replace(/^0/, '') : s;
  }

  /* ---- Modal ---- */
  function modal(opts) {
    var root = document.getElementById('modalRoot');
    var backdrop = el('div', { class: 'modal-backdrop' });
    var box = el('div', { class: 'modal' });

    var head = el('div', { class: 'modal-head' }, [
      el('h3', { text: opts.title || '' }),
      el('button', { class: 'modal-close', text: '✕', onclick: close })
    ]);
    box.appendChild(head);

    var body = el('div', { class: 'modal-body' });
    if (typeof opts.body === 'function') opts.body(body, close);
    else appendChildren(body, opts.body);
    box.appendChild(body);

    backdrop.appendChild(box);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop && opts.dismissable !== false) close();
    });
    root.appendChild(backdrop);

    function close() {
      backdrop.remove();
      if (opts.onClose) opts.onClose();
    }
    return { close: close, body: body };
  }

  function confirmDialog(message, onYes, opts) {
    opts = opts || {};
    modal({
      title: opts.title || 'Confirm',
      body: function (b, close) {
        b.appendChild(el('p', { text: message, class: 'mb' }));
        b.appendChild(el('div', { class: 'btn-row' }, [
          el('button', { class: 'btn ghost', text: 'Cancel', onclick: close }),
          el('button', {
            class: 'btn ' + (opts.danger ? 'danger' : 'primary'),
            text: opts.yesText || 'Confirm',
            onclick: function () { close(); onYes(); }
          })
        ]));
      }
    });
  }

  var toastTimer;
  function toast(msg) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var t = el('div', { class: 'toast', text: msg });
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 250);
    }, 2200);
  }

  function emptyState(icon, title, sub) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'big', text: icon }),
      el('div', { class: 'mb', html: '<strong>' + escapeHtml(title) + '</strong>' }),
      sub ? el('div', { class: 'small', text: sub }) : null
    ]);
  }

  global.U = {
    el: el, clear: clear, escapeHtml: escapeHtml, initials: initials,
    fmtDate: fmtDate, fmtDateTime: fmtDateTime, todayISO: todayISO,
    avg3: avg3, modal: modal, confirm: confirmDialog, toast: toast, emptyState: emptyState
  };
})(window);
