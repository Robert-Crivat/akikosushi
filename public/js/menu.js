(function () {
  'use strict';

  const A = window.Akiko;
  const list = document.querySelector('[data-menu-list]');
  const chips = document.querySelector('[data-menu-chips]');
  const search = document.querySelector('[data-menu-search]');
  const status = document.querySelector('[data-menu-status]');

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function groupByCategory(items) {
    const groups = [];
    const index = new Map();
    items.forEach(function (item) {
      if (!index.has(item.category)) {
        const group = { category: item.category, items: [] };
        index.set(item.category, group);
        groups.push(group);
      }
      index.get(item.category).items.push(item);
    });
    return groups;
  }

  function tagsFor(item) {
    const box = A.el('div', 'dish__tags');
    if (item.spicy) box.appendChild(A.el('span', 'tag', '🌶️ piccante'));
    if (item.vegetarian) box.appendChild(A.el('span', 'tag', '🌱 vegetariano'));
    if (item.frozen) {
      const mark = A.el('span', 'tag tag--mark', '*');
      mark.title = 'Preparato con ingredienti surgelati';
      box.appendChild(mark);
    }
    if (item.treated) {
      const mark = A.el('span', 'tag tag--mark', '#');
      mark.title = 'Abbattuto a -20°C conforme alla normativa CE 853/2004';
      box.appendChild(mark);
    }
    (item.allergens || []).forEach(function (allergen) {
      box.appendChild(A.el('span', 'tag', allergen));
    });
    return box;
  }

  function dishRow(item) {
    const row = A.el('article', 'dish dish--clickable');
    row.dataset.name = String(item.name || '').toLowerCase();
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', 'Vedi dettaglio ' + item.name);
    row.appendChild(A.thumbFor(item));

    const main = A.el('div', 'dish__main');
    const title = A.el('h3', 'dish__name', item.name);
    if (item.pieces) {
      title.appendChild(document.createTextNode(' '));
      title.appendChild(A.el('span', 'dish__pieces', '(' + item.pieces + ')'));
    }
    main.appendChild(title);
    if (item.description) main.appendChild(A.el('p', 'dish__desc', item.description));
    main.appendChild(tagsFor(item));
    row.appendChild(main);

    const side = A.el('div', 'dish__side');
    if (item.priceToVerify) {
      side.appendChild(A.el('span', 'dish__price dish__price--ask', 'Prezzo su richiesta'));
    } else {
      side.appendChild(A.el('span', 'dish__price', A.formatPrice(item.price)));
    }
    row.appendChild(side);

    function open() { A.openDishDialog(item); }
    row.addEventListener('click', open);
    row.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
    return row;
  }

  let activeCategory = null;

  function render(groups) {
    list.textContent = '';
    groups.forEach(function (group) {
      const id = 'cat-' + slugify(group.category);
      const section = A.el('section', 'menu-category');
      section.id = id;
      section.dataset.category = group.category;
      section.appendChild(A.el('h2', null, group.category));
      group.items.forEach(function (item, index) {
        const row = dishRow(item);
        section.appendChild(row);
        if (window.AkikoFX) window.AkikoFX.observeReveal(row, Math.min(index, 5) * 60);
      });
      list.appendChild(section);
    });

    A.renderCategoryChips(chips, groups.map(function (g) { return g.category; }), function (category) {
      activeCategory = category;
      applyFilter();
      list.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  function applyFilter() {
    const needle = (search ? search.value : '').trim().toLowerCase();
    let visible = 0;
    list.querySelectorAll('.menu-category').forEach(function (section) {
      const categoryMatch = !activeCategory || section.dataset.category === activeCategory;
      let shown = 0;
      section.querySelectorAll('.dish').forEach(function (row) {
        const match = categoryMatch && (!needle || row.dataset.name.includes(needle));
        row.classList.toggle('hidden', !match);
        if (match) shown += 1;
      });
      section.classList.toggle('hidden', shown === 0);
      visible += shown;
    });
    if (visible === 0) {
      status.textContent = needle
        ? 'Nessun piatto trovato per "' + search.value.trim() + '".'
        : 'Nessun piatto in questa categoria.';
      status.classList.remove('hidden');
    } else {
      status.classList.add('hidden');
    }
  }

  async function init() {
    if (!list) return;
    try {
      const items = await A.fetchJSON('/api/menu');
      render(groupByCategory(items));
    } catch (err) {
      A.showError(status, err.message);
      return;
    }
    if (search) {
      search.addEventListener('input', function () {
        applyFilter();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
