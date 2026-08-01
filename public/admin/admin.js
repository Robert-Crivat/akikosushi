const Admin = (function () {
  const loaders = {};
  const loaded = {};

  async function api(path, options) {
    const opts = Object.assign({ credentials: 'include' }, options);
    if (opts.body !== undefined && typeof opts.body !== 'string') {
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers);
      opts.body = JSON.stringify(opts.body);
    }

    const url = window.AKIKO_API_BASE && path.indexOf('/api') === 0 ? window.AKIKO_API_BASE + path : path;
    const res = await fetch(url, opts);
    if (res.status === 401) {
      window.location.replace('login.html');
      throw new Error('Sessione scaduta.');
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error((data && data.error) || 'Operazione non riuscita.');
    }
    return data;
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const key of Object.keys(props)) {
        const value = props[key];
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key in node) node[key] = value;
        else node.setAttribute(key, value);
      }
    }
    for (const child of children || []) {
      if (child === null || child === undefined) continue;
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function td(content, className) {
    const cell = el('td', className ? { class: className } : null, []);
    if (typeof content === 'string' || typeof content === 'number') {
      cell.textContent = String(content);
    } else if (content) {
      cell.append(content);
    }
    return cell;
  }

  function badge(text, variant) {
    return el('span', { class: 'badge badge-' + variant, text: text });
  }

  function select(options, value, onChange) {
    const node = el(
      'select',
      null,
      options.map((option) => el('option', { value: option, text: option }))
    );
    node.value = value;
    node.addEventListener('change', () => onChange(node.value, node));
    return node;
  }

  function money(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2).replace('.', ',') + ' €' : '—';
  }

  function dateTime(value) {
    if (!value) return '—';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function resDate(value) {
    if (!value) return '—';
    const parts = String(value).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
  }

  function message(node, text, ok) {
    node.textContent = text;
    node.className = 'msg ' + (ok ? 'msg-ok' : 'msg-error');
    if (ok) {
      window.clearTimeout(node._timer);
      node._timer = window.setTimeout(() => {
        node.textContent = '';
      }, 4000);
    }
  }

  function pill(id, count) {
    const node = document.getElementById('pill-' + id);
    if (!node) return;
    node.textContent = String(count);
    node.hidden = count <= 0;
  }

  function register(name, loader) {
    loaders[name] = loader;
  }

  function activate(name, force) {
    for (const button of document.querySelectorAll('.nav button')) {
      button.setAttribute('aria-selected', String(button.dataset.tab === name));
    }
    for (const panel of document.querySelectorAll('.panel')) {
      panel.hidden = panel.id !== 'panel-' + name;
    }
    if (loaders[name] && (force || !loaded[name])) {
      loaded[name] = true;
      loaders[name]();
    }
  }

  return {
    api,
    el,
    td,
    badge,
    select,
    money,
    dateTime,
    resDate,
    message,
    pill,
    register,
    activate,
  };
})();

(function () {
  document.querySelectorAll('.nav button').forEach((button) => {
    button.addEventListener('click', () => Admin.activate(button.dataset.tab, false));
  });

  document.getElementById('logout').addEventListener('click', async () => {
    try {
      await Admin.api('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      /* la sessione va comunque abbandonata lato client */
    }
    window.location.replace('login.html');
  });

  const passwordForm = document.getElementById('password-form');
  const passwordMsg = document.getElementById('password-msg');

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const current = document.getElementById('current-password');
    const next = document.getElementById('new-password');
    const confirm = document.getElementById('confirm-password');

    if (next.value.length < 8) {
      Admin.message(passwordMsg, 'La nuova password deve avere almeno 8 caratteri.', false);
      return;
    }
    if (next.value !== confirm.value) {
      Admin.message(passwordMsg, 'Le due nuove password non coincidono.', false);
      return;
    }

    try {
      await Admin.api('/api/admin/change-password', {
        method: 'POST',
        body: { currentPassword: current.value, newPassword: next.value },
      });
      passwordForm.reset();
      Admin.message(passwordMsg, 'Password aggiornata.', true);
    } catch (err) {
      Admin.message(passwordMsg, err.message, false);
    }
  });

  window.addEventListener('DOMContentLoaded', async () => {
    try {
      const me = await Admin.api('/api/admin/me');
      document.getElementById('current-user').textContent = me.username;
    } catch (err) {
      return;
    }
    Admin.activate('reservations', true);
  });
})();
