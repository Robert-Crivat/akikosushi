(function () {
  'use strict';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  async function fetchJSON(url, options) {
    let res;
    try {
      res = await fetch(url, options);
    } catch (err) {
      throw new Error('Connessione non riuscita. Controlla la rete e riprova.');
    }
    let data = null;
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      try {
        data = await res.json();
      } catch (err) {
        data = null;
      }
    }
    if (!res.ok) {
      const message = data && (data.error || data.message);
      throw new Error(message || 'Errore del server (' + res.status + '). Riprova più tardi.');
    }
    return data;
  }

  async function postJSON(url, body) {
    return fetchJSON(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function formatPrice(value) {
    const n = Number(value);
    if (!isFinite(n)) return '';
    return n.toFixed(2).replace('.', ',') + ' €';
  }

  function mapsUrl(location) {
    const query = location.mapsQuery || location.address || location.name || '';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  let locationsPromise = null;
  function getLocations() {
    if (!locationsPromise) {
      locationsPromise = fetchJSON('/api/locations').catch(function (err) {
        locationsPromise = null;
        throw err;
      });
    }
    return locationsPromise;
  }

  function locationCard(location) {
    const card = el('article', 'card');
    card.appendChild(el('h3', null, location.name));
    card.appendChild(el('p', null, location.address));
    card.appendChild(el('p', null, 'Orari: ' + location.hours));

    const links = el('div', 'card__links');

    const tel = el('a', null, 'Chiama ' + location.phoneDisplay);
    tel.href = 'tel:' + location.phone;
    links.appendChild(tel);

    if (location.whatsapp) {
      const wa = el('a', null, 'WhatsApp');
      wa.href = 'https://wa.me/' + location.whatsapp;
      wa.rel = 'noopener';
      wa.target = '_blank';
      links.appendChild(wa);
    }

    const maps = el('a', null, 'Apri in Google Maps');
    maps.href = mapsUrl(location);
    maps.rel = 'noopener';
    maps.target = '_blank';
    links.appendChild(maps);

    const more = el('a', null, 'Scopri di più');
    more.href = '/' + location.slug + '.html';
    links.appendChild(more);

    card.appendChild(links);
    return card;
  }

  function footerLocation(location) {
    const box = el('div');
    box.appendChild(el('h3', null, location.name));
    box.appendChild(el('p', null, location.address));
    box.appendChild(el('p', null, location.hours));
    const tel = el('a', null, location.phoneDisplay);
    tel.href = 'tel:' + location.phone;
    const p = el('p');
    p.appendChild(tel);
    box.appendChild(p);
    return box;
  }

  function fillLocationSelect(select, locations) {
    select.textContent = '';
    const placeholder = el('option', null, 'Seleziona una sede');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    locations.forEach(function (location) {
      const option = el('option', null, location.name);
      option.value = location.slug;
      select.appendChild(option);
    });
  }

  function renderLocationsInto(container, locations, renderer) {
    container.textContent = '';
    locations.forEach(function (location) {
      container.appendChild(renderer(location));
    });
  }

  function showError(container, message) {
    if (!container) return;
    container.textContent = '';
    container.appendChild(el('div', 'alert alert--error', message));
    container.classList.remove('hidden');
  }

  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      const open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (event) {
      if (event.target.tagName === 'A') {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  async function initSharedLocations() {
    const cards = document.querySelector('[data-locations-cards]');
    const footer = document.querySelector('[data-locations-footer]');
    const contacts = document.querySelector('[data-locations-contacts]');
    const selects = document.querySelectorAll('[data-locations-select]');
    if (!cards && !footer && !contacts && !selects.length) return;

    try {
      const locations = await getLocations();
      if (cards) renderLocationsInto(cards, locations, locationCard);
      if (footer) renderLocationsInto(footer, locations, footerLocation);
      if (contacts) renderLocationsInto(contacts, locations, locationCard);
      const preselect = new URLSearchParams(window.location.search).get('location');
      selects.forEach(function (select) {
        fillLocationSelect(select, locations);
        if (preselect && locations.some(function (l) { return l.slug === preselect; })) {
          select.value = preselect;
        }
      });
      document.dispatchEvent(new CustomEvent('akiko:locations', { detail: locations }));
    } catch (err) {
      if (cards) showError(cards, err.message);
      if (contacts) showError(contacts, err.message);
    }
  }

  const CATEGORY_PHOTOS = {
    Nighiri: '/images/nighiri-salmone-piatto.jpg',
    Sashimi: '/images/vassoio-sushi-vetro.jpg',
    Tataki: '/images/vassoio-sushi-vetro.jpg',
    Carpaccio: '/images/vassoio-sushi-vetro.jpg',
    Tatare: '/images/vassoio-sushi-vetro.jpg',
    Hosomaki: '/images/maki-salsa-teriyaki.jpg',
    Futomaki: '/images/maki-salsa-teriyaki.jpg',
    Temaki: '/images/maki-salsa-teriyaki.jpg',
    Gunkan: '/images/maki-salsa-teriyaki.jpg',
    Uramaki: '/images/piatto-sushi-misto.jpg',
    'Uramaki Venere': '/images/piatto-sushi-misto.jpg',
    'Sushi Misto': '/images/piatto-sushi-misto.jpg',
    Gamberi: '/images/gamberi-fritti-dolce.jpg',
    'Spiedini e Griglia': '/images/gamberi-fritti-dolce.jpg',
  };
  const CATEGORY_EMOJI = {
    Antipasti: '🥟', Insalate: '🥗', Zuppe: '🍲', Riso: '🍚', Gnocchi: '🍥',
    Ramen: '🍜', Spaghetti: '🍝', 'Verdure Saltate': '🥦', Pollo: '🍗',
    Maiale: '🥓', Manzo: '🥩', Anatra: '🦆', Guabao: '🥙', Onighiri: '🍙',
    Tacos: '🌮', Chips: '🍟', 'Pokè': '🥗', Dolci: '🍡', Bevande: '🥤',
    'Vini Bianchi': '🍷', 'Vini Rossi': '🍷', Birre: '🍺', Prosecco: '🥂',
  };

  const DISH_PHOTO_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 80, 81, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 120, 121, 122, 123, 124, 125, 126, 127, 130, 150, 151, 152, 153, 154, 155, 156, 170, 171, 172, 173, 174, 175, 176, 177, 178, 180, 181, 182, 183, 184, 185, 186, 191, 200, 201, 202, 203, 210, 211, 212, 213, 214, 216, 217, 218, 219, 220, 221, 222, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 290, 291, 292, 293, 294, 295, 310, 311, 312, 313, 330, 331, 332, 333, 334, 335, 340, 341, 342, 343, 350, 351, 352, 353, 354, 355, 356, 357, 358, 380, 381, 382, 383, 384, 420, 421, 422]);

  function dishThumb(item) {
    if (DISH_PHOTO_IDS.has(item.id)) return { type: 'photo', url: '/images/dishes/' + item.id + '.jpg' };
    if (CATEGORY_PHOTOS[item.category]) return { type: 'photo', url: CATEGORY_PHOTOS[item.category] };
    return { type: 'emoji', icon: CATEGORY_EMOJI[item.category] || '🍽️' };
  }

  function thumbFor(item) {
    const box = el('div', 'dish__thumb');
    const data = dishThumb(item);
    if (data.type === 'photo') {
      const img = document.createElement('img');
      img.src = data.url;
      img.alt = '';
      img.onerror = function () {
        box.textContent = CATEGORY_EMOJI[item.category] || '🍽️';
      };
      box.appendChild(img);
    } else {
      box.textContent = data.icon;
    }
    return box;
  }

  const CATEGORY_GROUPS = [
    { label: 'Sushi', categories: ['Nighiri', 'Hosomaki', 'Uramaki', 'Uramaki Venere', 'Futomaki', 'Guabao', 'Temaki', 'Onighiri', 'Gunkan', 'Tatare', 'Sashimi', 'Sushi Misto', 'Tacos', 'Chips', 'Carpaccio', 'Tataki', 'Pokè'] },
    { label: 'Antipasti & Contorni', categories: ['Antipasti', 'Insalate', 'Zuppe', 'Verdure Saltate'] },
    { label: 'Piatti Caldi', categories: ['Riso', 'Gnocchi', 'Ramen', 'Spaghetti', 'Pollo', 'Maiale', 'Manzo', 'Anatra', 'Gamberi', 'Spiedini e Griglia'] },
    { label: 'Dolci & Bevande', categories: ['Dolci', 'Bevande', 'Vini Bianchi', 'Vini Rossi', 'Birre', 'Prosecco'] },
  ];

  // Costruisce i chip di categoria raggruppati per macro-sezione (Sushi,
  // Antipasti & Contorni, Piatti Caldi, Dolci & Bevande) invece di un'unica
  // riga a scorrimento infinito: cosi' si vedono tutte le categorie insieme.
  // onSelect(category) viene chiamato con il nome categoria quando un chip
  // si attiva, o con null quando si disattiva (click di nuovo sullo stesso
  // chip = "mostra tutto"). Solo un chip alla volta puo' essere attivo.
  function renderCategoryChips(container, categoriesPresent, onSelect) {
    container.textContent = '';
    const presentSet = new Set(categoriesPresent);
    let activeChip = null;
    CATEGORY_GROUPS.forEach(function (group) {
      const inGroup = group.categories.filter(function (c) { return presentSet.has(c); });
      if (!inGroup.length) return;
      const box = el('div', 'chip-group');
      box.appendChild(el('span', 'chip-group__label', group.label));
      const row = el('div', 'chip-group__row');
      inGroup.forEach(function (category) {
        const chip = el('button', 'chip', category);
        chip.type = 'button';
        chip.dataset.category = category;
        chip.addEventListener('click', function () {
          if (activeChip === chip) {
            chip.classList.remove('is-active');
            activeChip = null;
            onSelect(null);
          } else {
            if (activeChip) activeChip.classList.remove('is-active');
            chip.classList.add('is-active');
            activeChip = chip;
            onSelect(category);
          }
        });
        row.appendChild(chip);
      });
      box.appendChild(row);
      container.appendChild(box);
    });
  }

  let dialogEl = null;
  function getDialog() {
    if (dialogEl) return dialogEl;
    dialogEl = document.createElement('dialog');
    dialogEl.className = 'dish-dialog';
    dialogEl.innerHTML =
      '<div class="dish-dialog__close-bar"><button type="button" class="dish-dialog__close" aria-label="Chiudi">✕</button></div>' +
      '<div class="dish-dialog__media" data-dialog-media></div>' +
      '<div class="dish-dialog__body">' +
      '<h3 class="dish-dialog__name" data-dialog-name></h3>' +
      '<p class="dish-dialog__desc" data-dialog-desc></p>' +
      '<div class="dish__tags" data-dialog-tags></div>' +
      '<div class="dish-dialog__footer">' +
      '<span class="dish-dialog__price" data-dialog-price></span>' +
      '<button type="button" class="btn btn--primary hidden" data-dialog-action></button>' +
      '</div></div>';
    document.body.appendChild(dialogEl);

    // Chiusura esplicita via JS, non affidata al comportamento nativo del
    // form method="dialog" (incoerente tra browser in certi casi): bottone
    // X, click sul backdrop, ed Escape chiamano tutti dialogEl.close().
    dialogEl.querySelector('.dish-dialog__close').addEventListener('click', function () {
      dialogEl.close();
    });
    dialogEl.addEventListener('click', function (event) {
      const rect = dialogEl.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialogEl.close();
    });
    dialogEl.addEventListener('cancel', function () {
      dialogEl.close();
    });
    return dialogEl;
  }

  function dishAllergenTags(item) {
    const box = el('div', 'dish__tags');
    if (item.spicy) box.appendChild(el('span', 'tag', '🌶️ piccante'));
    if (item.vegetarian) box.appendChild(el('span', 'tag', '🌱 vegetariano'));
    if (item.frozen) {
      const mark = el('span', 'tag tag--mark', '*');
      mark.title = 'Preparato con ingredienti surgelati';
      box.appendChild(mark);
    }
    if (item.treated) {
      const mark = el('span', 'tag tag--mark', '#');
      mark.title = 'Abbattuto a -20°C conforme alla normativa CE 853/2004';
      box.appendChild(mark);
    }
    (item.allergens || []).forEach(function (allergen) {
      box.appendChild(el('span', 'tag', allergen));
    });
    return box;
  }

  function openDishDialog(item, opts) {
    const dialog = getDialog();
    const media = dialog.querySelector('[data-dialog-media]');
    const name = dialog.querySelector('[data-dialog-name]');
    const desc = dialog.querySelector('[data-dialog-desc]');
    const tags = dialog.querySelector('[data-dialog-tags]');
    const price = dialog.querySelector('[data-dialog-price]');
    const action = dialog.querySelector('[data-dialog-action]');

    media.textContent = '';
    const data = dishThumb(item);
    if (data.type === 'photo') {
      const img = document.createElement('img');
      img.src = data.url;
      img.alt = item.name;
      img.onerror = function () { media.textContent = CATEGORY_EMOJI[item.category] || '🍽️'; media.classList.add('dish-dialog__media--icon'); };
      media.appendChild(img);
      media.classList.remove('dish-dialog__media--icon');
    } else {
      media.textContent = data.icon;
      media.classList.add('dish-dialog__media--icon');
    }

    let title = item.name;
    if (item.pieces) title += ' (' + item.pieces + ')';
    name.textContent = title;
    desc.textContent = item.description || '';
    desc.classList.toggle('hidden', !item.description);
    tags.textContent = '';
    tags.appendChild(dishAllergenTags(item));
    price.textContent = item.priceToVerify ? 'Prezzo su richiesta' : formatPrice(item.price);

    if (opts && opts.actionLabel) {
      action.textContent = opts.actionLabel;
      action.classList.remove('hidden');
      action.onclick = function () {
        if (opts.onAction) opts.onAction();
      };
    } else {
      action.classList.add('hidden');
      action.onclick = null;
    }

    dialog.showModal();
  }

  function initYear() {
    const target = document.querySelector('[data-year]');
    if (target) target.textContent = String(new Date().getFullYear());
  }

  window.Akiko = {
    el: el,
    fetchJSON: fetchJSON,
    postJSON: postJSON,
    formatPrice: formatPrice,
    getLocations: getLocations,
    mapsUrl: mapsUrl,
    showError: showError,
    thumbFor: thumbFor,
    renderCategoryChips: renderCategoryChips,
    openDishDialog: openDishDialog,
    dishAllergenTags: dishAllergenTags,
  };

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initYear();
    initSharedLocations();
  });
})();
