(function () {
  'use strict';

  const A = window.Akiko;
  const STORAGE_KEY = 'akiko_cart';
  const DISCOUNT_MIN = 30;
  const DISCOUNT_RATE = 0.1;

  const list = document.querySelector('[data-order-list]');
  const status = document.querySelector('[data-order-status]');
  const search = document.querySelector('[data-order-search]');
  const chips = document.querySelector('[data-order-chips]');
  const cartItems = document.querySelector('[data-cart-items]');
  const cartTotals = document.querySelector('[data-cart-totals]');
  const discountProgress = document.querySelector('[data-discount-progress]');
  const cartCount = document.querySelectorAll('[data-cart-count]');
  const cartBarTotal = document.querySelector('[data-cart-bar-total]');
  const cartBar = document.querySelector('.cart-bar');
  const form = document.querySelector('[data-order-form]');
  const feedback = document.querySelector('[data-order-feedback]');

  let menuIndex = new Map();
  let cart = [];

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .map(function (entry) {
          return { id: Number(entry.id), qty: Number(entry.qty), price: Number(entry.price) };
        })
        .filter(function (entry) {
          return Number.isFinite(entry.id) && entry.qty > 0;
        });
    } catch (err) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      /* storage non disponibile: il carrello resta solo in memoria */
    }
  }

  function orderable(item) {
    return !!item && item.available !== 0 && !item.priceToVerify && Number.isFinite(Number(item.price));
  }

  function reconcile() {
    const removed = [];
    const repriced = [];
    cart = cart.filter(function (entry) {
      const item = menuIndex.get(entry.id);
      if (!orderable(item)) {
        removed.push(item ? item.name : 'Un piatto non più disponibile');
        return false;
      }
      if (Number(item.price) !== entry.price) {
        repriced.push(item.name);
        entry.price = Number(item.price);
      }
      return true;
    });
    save();
    const messages = [];
    if (removed.length) messages.push('Rimossi dal carrello perché non più disponibili: ' + removed.join(', ') + '.');
    if (repriced.length) messages.push('Prezzo aggiornato per: ' + repriced.join(', ') + '.');
    if (messages.length) setFeedback('error', messages.join(' '));
  }

  function totals() {
    const subtotal = cart.reduce(function (sum, entry) {
      return sum + entry.price * entry.qty;
    }, 0);
    const discount = subtotal >= DISCOUNT_MIN ? subtotal * DISCOUNT_RATE : 0;
    return { subtotal: subtotal, discount: discount, total: subtotal - discount };
  }

  function setFeedback(kind, message) {
    feedback.textContent = '';
    feedback.appendChild(A.el('div', 'alert alert--' + kind, message));
    feedback.classList.remove('hidden');
  }

  function addToCart(item) {
    const existing = cart.find(function (entry) {
      return entry.id === item.id;
    });
    if (existing) existing.qty += 1;
    else cart.push({ id: item.id, qty: 1, price: Number(item.price) });
    save();
    renderCart();
  }

  function changeQty(id, delta) {
    const entry = cart.find(function (row) {
      return row.id === id;
    });
    if (!entry) return;
    entry.qty += delta;
    if (entry.qty <= 0) removeFromCart(id);
    else {
      save();
      renderCart();
    }
  }

  function removeFromCart(id) {
    cart = cart.filter(function (entry) {
      return entry.id !== id;
    });
    save();
    renderCart();
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

  function flashAdded(item, btn) {
    addToCart(item);
    if (btn) {
      btn.textContent = '✓ Aggiunto';
      btn.classList.add('is-added');
      window.setTimeout(function () {
        btn.textContent = '+ Aggiungi';
        btn.classList.remove('is-added');
      }, 900);
    }
    if (window.AkikoFX) {
      window.AkikoFX.toast(item.name + ' aggiunto al carrello');
      cartCount.forEach(function (node) { window.AkikoFX.bump(node); });
    }
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
    if (orderable(item)) {
      side.appendChild(A.el('span', 'dish__price', A.formatPrice(item.price)));
      const add = A.el('button', 'dish__add', '+ Aggiungi');
      add.type = 'button';
      add.setAttribute('aria-label', 'Aggiungi ' + item.name + ' al carrello');
      add.addEventListener('click', function (event) {
        event.stopPropagation();
        flashAdded(item, add);
      });
      side.appendChild(add);
    } else {
      side.appendChild(A.el('span', 'dish__price dish__price--ask', 'Prezzo su richiesta, non ordinabile online'));
    }
    row.appendChild(side);

    function openDetail() {
      A.openDishDialog(item, orderable(item) ? {
        actionLabel: '+ Aggiungi al carrello',
        onAction: function () {
          flashAdded(item);
          document.querySelector('.dish-dialog').close();
        },
      } : null);
    }
    row.addEventListener('click', openDetail);
    row.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDetail();
      }
    });
    return row;
  }

  function renderMenu(items) {
    list.textContent = '';
    let current = null;
    let posInCategory = 0;
    const categories = [];
    items.forEach(function (item) {
      if (!current || current.dataset.category !== item.category) {
        current = A.el('section', 'menu-category');
        current.id = 'order-cat-' + slugify(item.category);
        current.dataset.category = item.category;
        current.appendChild(A.el('h2', null, item.category));
        list.appendChild(current);
        posInCategory = 0;
        categories.push(item.category);
      }
      const row = dishRow(item);
      current.appendChild(row);
      if (window.AkikoFX) window.AkikoFX.observeReveal(row, Math.min(posInCategory, 5) * 60);
      posInCategory += 1;
    });

    if (chips) {
      A.renderCategoryChips(chips, categories, function (category) {
        activeCategory = category;
        applyFilter();
        list.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
  }

  let activeCategory = null;

  function applyFilter() {
    const needle = (search ? search.value : '').trim().toLowerCase();
    list.querySelectorAll('.menu-category').forEach(function (section) {
      const categoryMatch = !activeCategory || section.dataset.category === activeCategory;
      let shown = 0;
      section.querySelectorAll('.dish').forEach(function (row) {
        const match = categoryMatch && (!needle || row.dataset.name.includes(needle));
        row.classList.toggle('hidden', !match);
        if (match) shown += 1;
      });
      section.classList.toggle('hidden', shown === 0);
    });
  }

  function cartRow(entry) {
    const item = menuIndex.get(entry.id);
    const row = A.el('li', 'cart__item');
    row.appendChild(item ? A.thumbFor(item) : A.el('div', 'dish__thumb', '🍽️'));

    const left = A.el('div');
    left.appendChild(A.el('b', null, item ? item.name : 'Piatto'));
    left.appendChild(A.el('small', null, A.formatPrice(entry.price) + ' cad.'));
    const remove = A.el('button', 'cart__remove', 'Rimuovi');
    remove.type = 'button';
    remove.addEventListener('click', function () {
      removeFromCart(entry.id);
    });
    left.appendChild(remove);
    row.appendChild(left);

    const right = A.el('div');
    const qty = A.el('div', 'qty');
    const minus = A.el('button', null, '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'Riduci quantità');
    minus.addEventListener('click', function () {
      changeQty(entry.id, -1);
    });
    const plus = A.el('button', null, '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'Aumenta quantità');
    plus.addEventListener('click', function () {
      changeQty(entry.id, 1);
    });
    qty.appendChild(minus);
    qty.appendChild(A.el('span', null, entry.qty));
    qty.appendChild(plus);
    right.appendChild(qty);
    right.appendChild(A.el('small', null, A.formatPrice(entry.price * entry.qty)));
    row.appendChild(right);
    return row;
  }

  function totalRow(label, value, modifier) {
    const row = A.el('div', 'cart__row' + (modifier ? ' cart__row--' + modifier : ''));
    row.appendChild(A.el('span', null, label));
    row.appendChild(A.el('span', null, A.formatPrice(value)));
    return row;
  }

  function renderCart() {
    const sums = totals();
    const count = cart.reduce(function (sum, entry) {
      return sum + entry.qty;
    }, 0);

    cartItems.textContent = '';
    if (!cart.length) {
      cartItems.appendChild(A.el('li', 'cart__empty', 'Il carrello è vuoto. Aggiungi i piatti dal menu qui accanto.'));
    } else {
      cart.forEach(function (entry) {
        cartItems.appendChild(cartRow(entry));
      });
    }

    if (discountProgress) {
      discountProgress.textContent = '';
      if (cart.length) {
        const pct = Math.min(100, (sums.subtotal / DISCOUNT_MIN) * 100);
        const bar = A.el('div', 'discount-progress__bar');
        const fill = A.el('div', 'discount-progress__fill');
        fill.style.width = pct.toFixed(0) + '%';
        bar.appendChild(fill);
        discountProgress.appendChild(bar);
        const label = A.el('div', 'discount-progress__label');
        if (sums.discount > 0) {
          label.appendChild(document.createTextNode('🎉 '));
          const strong = A.el('strong', null, 'Sconto -10% applicato!');
          label.appendChild(strong);
        } else {
          label.textContent = 'Aggiungi ' + A.formatPrice(DISCOUNT_MIN - sums.subtotal) + ' per lo sconto del 10%';
        }
        discountProgress.appendChild(label);
      }
    }

    cartTotals.textContent = '';
    cartTotals.appendChild(totalRow('Subtotale', sums.subtotal));
    if (sums.discount > 0) {
      cartTotals.appendChild(totalRow('-10% (spesa minima 30€ raggiunta)', -sums.discount, 'discount'));
    }
    cartTotals.appendChild(totalRow('Totale stimato', sums.total, 'total'));

    cartCount.forEach(function (node) {
      node.textContent = String(count);
    });
    if (cartBarTotal) cartBarTotal.textContent = A.formatPrice(sums.total);
    if (cartBar) cartBar.classList.toggle('hidden', count === 0);

    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = count === 0;
  }

  let orderConfirmDialog = null;
  function getOrderConfirmDialog() {
    if (orderConfirmDialog) return orderConfirmDialog;
    orderConfirmDialog = document.createElement('dialog');
    orderConfirmDialog.className = 'dish-dialog order-confirm';
    document.body.appendChild(orderConfirmDialog);
    orderConfirmDialog.addEventListener('click', function (event) {
      const rect = orderConfirmDialog.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) orderConfirmDialog.close();
    });
    return orderConfirmDialog;
  }

  function showOrderConfirmDialog(details) {
    const dlg = getOrderConfirmDialog();
    dlg.textContent = '';

    const closeBar = A.el('div', 'dish-dialog__close-bar');
    const closeBtn = A.el('button', 'dish-dialog__close', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Chiudi');
    closeBtn.addEventListener('click', function () { dlg.close(); });
    closeBar.appendChild(closeBtn);
    dlg.appendChild(closeBar);

    const body = A.el('div', 'dish-dialog__body order-confirm__body');
    body.appendChild(A.el('p', 'eyebrow', 'Ordine ricevuto 🎉'));
    body.appendChild(A.el('h3', 'dish-dialog__name', 'Grazie, ' + details.name + '!'));
    if (details.orderId) {
      body.appendChild(A.el('p', 'dish-dialog__desc', 'Numero ordine #' + details.orderId + '. Ti aspettiamo al ritiro, riceverai una chiamata di conferma.'));
    }

    const list = A.el('ul', 'order-confirm__items');
    details.items.forEach(function (line) {
      const li = A.el('li');
      li.appendChild(A.el('span', null, line.qty + '× ' + line.name));
      li.appendChild(A.el('span', null, A.formatPrice(line.price * line.qty)));
      list.appendChild(li);
    });
    body.appendChild(list);

    const totals = A.el('div', 'order-confirm__totals');
    function totalLine(label, value, cls) {
      const row = A.el('div', 'cart__row' + (cls ? ' cart__row--' + cls : ''));
      row.appendChild(A.el('span', null, label));
      row.appendChild(A.el('span', null, A.formatPrice(value)));
      return row;
    }
    totals.appendChild(totalLine('Subtotale', details.subtotal));
    if (details.discount > 0) totals.appendChild(totalLine('Sconto -10%', -details.discount, 'discount'));
    totals.appendChild(totalLine('Totale', details.total, 'total'));
    body.appendChild(totals);

    const info = A.el('div', 'order-confirm__info');
    info.appendChild(A.el('p', null, '📍 Ritiro presso: ' + details.locationName));
    info.appendChild(A.el('p', null, '🕐 Orario: ' + details.pickupTime));
    info.appendChild(A.el('p', null, '📞 ' + details.phone));
    if (details.notes) info.appendChild(A.el('p', null, '📝 ' + details.notes));
    body.appendChild(info);

    const actions = A.el('div', 'hero__actions');
    const closeAction = A.el('button', 'btn btn--primary', 'Perfetto, grazie');
    closeAction.type = 'button';
    closeAction.addEventListener('click', function () { dlg.close(); });
    actions.appendChild(closeAction);
    body.appendChild(actions);

    dlg.appendChild(body);
    dlg.showModal();
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!cart.length) {
      setFeedback('error', 'Aggiungi almeno un piatto al carrello.');
      return;
    }
    if (!form.reportValidity()) return;

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    feedback.classList.add('hidden');

    const data = new FormData(form);
    const locationSelect = form.querySelector('[name="location"]');
    const locationName = locationSelect && locationSelect.selectedOptions[0]
      ? locationSelect.selectedOptions[0].textContent
      : String(data.get('location') || '');
    const payload = {
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      location: String(data.get('location') || ''),
      pickupTime: String(data.get('pickupTime') || ''),
      notes: String(data.get('notes') || '').trim(),
      items: cart.map(function (entry) {
        return { id: entry.id, qty: entry.qty };
      }),
    };
    const cartSnapshot = cart.map(function (entry) {
      const item = menuIndex.get(entry.id);
      return { id: entry.id, qty: entry.qty, price: entry.price, name: item ? item.name : 'Piatto' };
    });

    try {
      const result = await A.postJSON('/api/orders/takeaway', payload);
      const sums = totals();
      cart = [];
      save();
      renderCart();
      form.reset();
      setFeedback('ok', 'Ordine inviato! Guarda il riepilogo qui sopra.');
      showOrderConfirmDialog({
        orderId: result && (result.orderNumber || result.orderId || result.id),
        name: payload.name,
        phone: payload.phone,
        notes: payload.notes,
        locationName: locationName,
        pickupTime: payload.pickupTime,
        items: cartSnapshot,
        subtotal: (result && result.subtotal) || sums.subtotal,
        discount: (result && result.discount) || sums.discount,
        total: (result && result.total) || sums.total,
      });
    } catch (err) {
      setFeedback('error', err.message);
      await refreshMenu();
    } finally {
      submit.disabled = false;
      renderCart();
    }
  }

  async function refreshMenu() {
    const items = await A.fetchJSON('/api/menu');
    menuIndex = new Map(
      items.map(function (item) {
        return [item.id, item];
      })
    );
    return items;
  }

  function initCartToggle() {
    const toggle = document.querySelector('[data-cart-toggle]');
    const close = document.querySelector('[data-cart-close]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        document.body.classList.add('cart-open');
      });
    }
    if (close) {
      close.addEventListener('click', function () {
        document.body.classList.remove('cart-open');
      });
    }
  }

  async function init() {
    if (!list) return;
    cart = load();
    initCartToggle();
    form.addEventListener('submit', onSubmit);
    if (search) {
      search.addEventListener('input', function () {
        applyFilter();
      });
    }
    try {
      const items = await refreshMenu();
      renderMenu(items);
      reconcile();
    } catch (err) {
      A.showError(status, err.message);
    }
    renderCart();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
