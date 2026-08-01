(function () {
  const body = document.getElementById('menu-body');
  const empty = document.getElementById('menu-empty');
  const banner = document.getElementById('menu-banner');
  const count = document.getElementById('menu-count');
  const msg = document.getElementById('menu-msg');
  const search = document.getElementById('menu-search');
  const categorySelect = document.getElementById('menu-category');
  const onlyUnverified = document.getElementById('menu-only-unverified');
  const categoryList = document.getElementById('menu-categories');

  let items = [];

  function needsPrice(item) {
    return !!item.price_to_verify || item.price === null || item.price === undefined;
  }

  function checkbox(label, checked) {
    const input = Admin.el('input', { type: 'checkbox', checked: !!checked });
    return { input, node: Admin.el('label', { class: 'check' }, [input, ' ' + label]) };
  }

  function renderBanner() {
    const missing = items.filter(needsPrice).length;
    banner.textContent =
      missing > 0
        ? `⚠ ${missing} ${missing === 1 ? 'piatto senza prezzo confermato' : 'piatti senza prezzo confermato'} — sistemali prima di attivare gli ordini online`
        : '✓ Tutti i prezzi sono confermati.';
    banner.className = 'banner ' + (missing > 0 ? 'banner-warn' : 'banner-ok');
    Admin.pill('menu', missing);
  }

  function renderFilters() {
    const categories = [...new Set(items.map((item) => item.category))].sort((a, b) =>
      a.localeCompare(b, 'it')
    );

    const previous = categorySelect.value;
    categorySelect.textContent = '';
    categorySelect.append(Admin.el('option', { value: '', text: 'Tutte' }));
    categoryList.textContent = '';
    for (const category of categories) {
      categorySelect.append(Admin.el('option', { value: category, text: category }));
      categoryList.append(Admin.el('option', { value: category }));
    }
    categorySelect.value = categories.includes(previous) ? previous : '';
  }

  function visibleItems() {
    const term = search.value.trim().toLowerCase();
    const category = categorySelect.value;
    return items.filter((item) => {
      if (category && item.category !== category) return false;
      if (onlyUnverified.checked && !needsPrice(item)) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        String(item.description || '').toLowerCase().includes(term) ||
        String(item.id) === term
      );
    });
  }

  function buildRow(item) {
    const name = Admin.el('input', { type: 'text', value: item.name || '' });
    const pieces = Admin.el('input', { type: 'text', value: item.pieces || '' });
    const description = Admin.el('input', { type: 'text', value: item.description || '' });
    const price = Admin.el('input', {
      type: 'number',
      min: '0',
      step: '0.10',
      value: item.price === null || item.price === undefined ? '' : String(item.price),
    });

    const verify = checkbox('Da confermare', item.price_to_verify);
    const available = checkbox('Disponibile', item.available);
    const frozen = checkbox('Surgelato', item.frozen);
    const treated = checkbox('Abbattuto', item.treated);
    const spicy = checkbox('Piccante', item.spicy);

    price.addEventListener('input', () => {
      if (price.value !== '' && Number(price.value) >= 0) verify.input.checked = false;
    });

    const nameCell = Admin.el('td', null, [name]);
    if (needsPrice(item)) {
      nameCell.append(
        document.createElement('br'),
        Admin.badge('PREZZO DA CONFERMARE', 'warn')
      );
    }

    const save = Admin.el('button', {
      type: 'button',
      class: 'btn btn-sm btn-primary',
      text: 'Salva',
    });
    const remove = Admin.el('button', {
      type: 'button',
      class: 'btn btn-sm btn-danger',
      text: 'Elimina',
    });

    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        await Admin.api('/api/admin/menu/' + item.id, {
          method: 'PUT',
          body: {
            name: name.value,
            pieces: pieces.value,
            description: description.value,
            price: price.value === '' ? null : Number(price.value),
            priceToVerify: verify.input.checked,
            available: available.input.checked,
            frozen: frozen.input.checked,
            treated: treated.input.checked,
            spicy: spicy.input.checked,
          },
        });
        Admin.message(msg, `"${name.value}" salvato.`, true);
        await load();
      } catch (err) {
        Admin.message(msg, err.message, false);
      } finally {
        save.disabled = false;
      }
    });

    remove.addEventListener('click', async () => {
      if (!window.confirm(`Eliminare definitivamente "${item.name}" dal menu?`)) return;
      remove.disabled = true;
      try {
        await Admin.api('/api/admin/menu/' + item.id, { method: 'DELETE' });
        Admin.message(msg, `"${item.name}" eliminato.`, true);
        await load();
      } catch (err) {
        Admin.message(msg, err.message, false);
        remove.disabled = false;
      }
    });

    return Admin.el('tr', needsPrice(item) ? { class: 'pending' } : null, [
      Admin.td(String(item.id)),
      Admin.td(item.category),
      nameCell,
      Admin.el('td', null, [pieces]),
      Admin.el('td', { class: 'wrap' }, [description]),
      Admin.el('td', null, [price]),
      Admin.el('td', { class: 'wrap' }, [
        verify.node,
        available.node,
        frozen.node,
        treated.node,
        spicy.node,
      ]),
      Admin.el('td', null, [Admin.el('div', { class: 'row-actions' }, [save, remove])]),
    ]);
  }

  function renderTable() {
    const rows = visibleItems();
    body.textContent = '';
    empty.hidden = rows.length > 0;
    count.textContent = `${rows.length} di ${items.length} piatti`;
    const fragment = document.createDocumentFragment();
    for (const item of rows) fragment.append(buildRow(item));
    body.append(fragment);
  }

  async function load() {
    try {
      items = await Admin.api('/api/admin/menu');
    } catch (err) {
      Admin.message(msg, err.message, false);
      return;
    }
    renderBanner();
    renderFilters();
    renderTable();
  }

  search.addEventListener('input', renderTable);
  categorySelect.addEventListener('change', renderTable);
  onlyUnverified.addEventListener('change', renderTable);
  document.getElementById('menu-reload').addEventListener('click', load);

  /* ---------- nuovo piatto ---------- */

  const newForm = document.getElementById('menu-new-form');
  const newMsg = document.getElementById('menu-new-msg');

  newForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const priceValue = document.getElementById('new-price').value;

    try {
      await Admin.api('/api/admin/menu', {
        method: 'POST',
        body: {
          id: Number(document.getElementById('new-id').value),
          category: document.getElementById('new-category').value,
          name: document.getElementById('new-name').value,
          pieces: document.getElementById('new-pieces').value,
          description: document.getElementById('new-description').value,
          price: priceValue === '' ? null : Number(priceValue),
          priceToVerify: document.getElementById('new-price-to-verify').checked,
          available: document.getElementById('new-available').checked,
          frozen: document.getElementById('new-frozen').checked,
          treated: document.getElementById('new-treated').checked,
          spicy: document.getElementById('new-spicy').checked,
        },
      });
      newForm.reset();
      document.getElementById('new-available').checked = true;
      Admin.message(newMsg, 'Piatto aggiunto.', true);
      await load();
    } catch (err) {
      Admin.message(newMsg, err.message, false);
    }
  });

  Admin.register('menu', load);
})();
