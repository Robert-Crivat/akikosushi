(function () {
  const RES_STATUSES = ['in attesa', 'confermata', 'rifiutata', 'completata'];
  const ORD_STATUSES = ['ricevuto', 'in preparazione', 'pronto', 'ritirato', 'annullato'];

  const LOCATIONS = { nepi: 'Nepi', vetralla: 'Cura di Vetralla' };

  const VARIANTS = {
    'in attesa': 'warn',
    confermata: 'ok',
    rifiutata: 'neutral',
    completata: 'gold',
    ricevuto: 'warn',
    'in preparazione': 'gold',
    pronto: 'ok',
    ritirato: 'neutral',
    annullato: 'neutral',
  };

  function locationName(slug) {
    return LOCATIONS[slug] || slug || '—';
  }

  function contacts(row) {
    const lines = [document.createTextNode(row.phone || '—')];
    if (row.email) {
      lines.push(document.createElement('br'));
      lines.push(Admin.el('span', { class: 'badge badge-neutral', text: row.email }));
    }
    return Admin.el('div', null, lines);
  }

  function statusCell(row, statuses, endpoint, msg, onDone) {
    const cell = Admin.el('td', null, []);
    const current = Admin.badge(row.status, VARIANTS[row.status] || 'neutral');
    const picker = Admin.select(statuses, row.status, async (value, node) => {
      node.disabled = true;
      try {
        await Admin.api(`${endpoint}/${row.id}`, { method: 'PATCH', body: { status: value } });
        row.status = value;
        Admin.message(msg, `Stato aggiornato a "${value}".`, true);
        onDone();
      } catch (err) {
        node.value = row.status;
        Admin.message(msg, err.message, false);
      } finally {
        node.disabled = false;
      }
    });
    cell.append(current, document.createElement('br'), picker);
    return cell;
  }

  /* ---------- prenotazioni ---------- */

  const resBody = document.getElementById('res-body');
  const resEmpty = document.getElementById('res-empty');
  const resMsg = document.getElementById('res-msg');
  const resFilter = document.getElementById('res-status');

  async function loadReservations() {
    const query = resFilter.value ? `?status=${encodeURIComponent(resFilter.value)}` : '';
    let rows;
    try {
      rows = await Admin.api('/api/admin/reservations' + query);
    } catch (err) {
      Admin.message(resMsg, err.message, false);
      return;
    }

    resBody.textContent = '';
    resEmpty.hidden = rows.length > 0;

    for (const row of rows) {
      const tr = Admin.el('tr', row.status === 'in attesa' ? { class: 'pending' } : null, [
        Admin.td(`${Admin.resDate(row.res_date)} · ${row.res_time || '—'}`),
        Admin.td(row.name),
        Admin.td(contacts(row)),
        Admin.td(String(row.people ?? '—')),
        Admin.td(locationName(row.location)),
        Admin.td(row.notes || '—', 'wrap'),
        statusCell(row, RES_STATUSES, '/api/admin/reservations', resMsg, loadReservations),
        Admin.td(Admin.dateTime(row.created_at)),
      ]);
      resBody.append(tr);
    }

    Admin.pill('reservations', rows.filter((row) => row.status === 'in attesa').length);
  }

  resFilter.addEventListener('change', loadReservations);
  document.getElementById('res-reload').addEventListener('click', loadReservations);
  Admin.register('reservations', loadReservations);

  /* ---------- ordini take away ---------- */

  const ordBody = document.getElementById('ord-body');
  const ordEmpty = document.getElementById('ord-empty');
  const ordMsg = document.getElementById('ord-msg');
  const ordFilter = document.getElementById('ord-status');

  function itemList(items) {
    const list = Admin.el('ul', { class: 'order-items' }, []);
    for (const item of items || []) {
      list.append(
        Admin.el('li', null, [
          Admin.el('span', { text: `${item.name} × ${item.qty}` }),
          Admin.el('span', { text: Admin.money(item.lineTotal) }),
        ])
      );
    }
    if (!list.children.length) list.append(Admin.el('li', { text: 'Nessun articolo' }));
    return list;
  }

  function totalsCell(row) {
    const lines = [Admin.el('div', { text: 'Subtot. ' + Admin.money(row.subtotal) })];
    if (Number(row.discount) > 0) {
      lines.push(Admin.el('div', { text: 'Sconto −' + Admin.money(row.discount) }));
    }
    lines.push(Admin.el('div', null, [Admin.el('strong', { text: Admin.money(row.total) })]));
    lines.push(Admin.el('div', { text: row.payment_method === 'online' ? '💳 Pagamento online' : '🏠 Pagamento in sede' }));
    return Admin.el('div', { class: 'totals' }, lines);
  }

  async function loadOrders() {
    const query = ordFilter.value ? `?status=${encodeURIComponent(ordFilter.value)}` : '';
    let rows;
    try {
      rows = await Admin.api('/api/admin/orders' + query);
    } catch (err) {
      Admin.message(ordMsg, err.message, false);
      return;
    }

    ordBody.textContent = '';
    ordEmpty.hidden = rows.length > 0;

    for (const row of rows) {
      const tr = Admin.el('tr', row.status === 'ricevuto' ? { class: 'pending' } : null, [
        Admin.td(
          Admin.el('div', null, [
            Admin.el('strong', { text: '#' + row.id }),
            document.createElement('br'),
            Admin.el('span', { text: Admin.dateTime(row.created_at) }),
          ])
        ),
        Admin.td(
          Admin.el('div', null, [
            Admin.el('strong', { text: row.name }),
            document.createElement('br'),
            contacts(row),
          ])
        ),
        Admin.td(
          Admin.el('div', null, [
            Admin.el('span', { text: locationName(row.location) }),
            document.createElement('br'),
            Admin.el('strong', { text: row.pickup_time || '—' }),
          ])
        ),
        Admin.td(itemList(row.items)),
        Admin.td(totalsCell(row)),
        Admin.td(row.notes || '—', 'wrap'),
        statusCell(row, ORD_STATUSES, '/api/admin/orders', ordMsg, loadOrders),
      ]);
      ordBody.append(tr);
    }

    Admin.pill('orders', rows.filter((row) => row.status === 'ricevuto').length);
  }

  ordFilter.addEventListener('change', loadOrders);
  document.getElementById('ord-reload').addEventListener('click', loadOrders);
  Admin.register('orders', loadOrders);

  // Aggiornamento automatico: prenotazioni e ordini arrivano mentre il
  // ristorante lavora, non ha senso dover premere "Aggiorna" a mano.
  // In pausa quando la scheda del browser non è visibile, per non
  // sprecare richieste inutili.
  const AUTO_REFRESH_MS = 20000;
  window.setInterval(function () {
    if (document.hidden) return;
    loadReservations();
    loadOrders();
  }, AUTO_REFRESH_MS);
})();
