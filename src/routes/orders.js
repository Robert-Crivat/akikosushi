const express = require('express');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const locations = require('../data/locations.json');

const router = express.Router();

const STATUSES = ['ricevuto', 'in preparazione', 'pronto', 'ritirato', 'annullato'];
const DISCOUNT_THRESHOLD = 30;
const DISCOUNT_RATE = 0.1;

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function money(value) {
  return Math.round(value * 100) / 100;
}

function isKnownLocation(slug) {
  return locations.some((loc) => loc.slug === slug);
}

router.post('/orders/takeaway', (req, res) => {
  const body = req.body || {};
  const name = str(body.name);
  const phone = str(body.phone);
  const email = str(body.email);
  const location = str(body.location);
  const pickupTime = str(body.pickupTime);
  const notes = str(body.notes);
  const items = Array.isArray(body.items) ? body.items : null;

  if (!name) return res.status(400).json({ error: 'Il nome è obbligatorio.' });
  if (!phone) return res.status(400).json({ error: 'Il numero di telefono è obbligatorio.' });
  if (!location) return res.status(400).json({ error: 'La sede di ritiro è obbligatoria.' });
  if (!isKnownLocation(location)) return res.status(400).json({ error: 'Sede non valida.' });
  if (!pickupTime) return res.status(400).json({ error: "L'orario di ritiro è obbligatorio." });
  if (!items || items.length === 0) return res.status(400).json({ error: 'Il carrello è vuoto.' });

  const selectItem = db.prepare('SELECT * FROM menu_items WHERE id = ? AND available = 1');
  const lines = [];
  let subtotal = 0;

  for (const raw of items) {
    const entry = raw && typeof raw === 'object' ? raw : {};
    const id = Number(entry.id);
    const qty = Number(entry.qty);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Piatto non valido nel carrello.', item: entry.id });
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'La quantità deve essere un intero maggiore di zero.', item: id });
    }

    const dish = selectItem.get(id);
    if (!dish) {
      return res.status(400).json({ error: 'Piatto non disponibile o inesistente.', item: id });
    }
    if (dish.price_to_verify || dish.price === null) {
      return res.status(400).json({
        error: `"${dish.name}" ha un prezzo da confermare: chiamaci per ordinarlo.`,
        item: dish.name,
      });
    }

    // Il prezzo viene sempre riletto dal DB: mai fidarsi di quello inviato dal client.
    const lineTotal = money(dish.price * qty);
    subtotal += lineTotal;
    lines.push({ id: dish.id, name: dish.name, qty, unitPrice: dish.price, lineTotal });
  }

  subtotal = money(subtotal);
  const discount = subtotal >= DISCOUNT_THRESHOLD ? money(subtotal * DISCOUNT_RATE) : 0;
  const total = money(subtotal - discount);

  const info = db
    .prepare(`
      INSERT INTO orders (name, phone, email, location, pickup_time, notes, items_json, subtotal, discount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      name,
      phone,
      email || null,
      location,
      pickupTime,
      notes || null,
      JSON.stringify(lines),
      subtotal,
      discount,
      total
    );

  res.status(201).json({ id: info.lastInsertRowid, subtotal, discount, total, status: 'ricevuto' });
});

router.get('/admin/orders', requireAdmin, (req, res) => {
  const status = str(req.query.status);
  const rows = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC, id DESC').all(status)
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC').all();

  res.json(
    rows.map(({ items_json, ...order }) => ({
      ...order,
      items: JSON.parse(items_json),
    }))
  );
});

router.patch('/admin/orders/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID non valido.' });

  const status = str((req.body || {}).status);
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Stato non valido. Valori ammessi: ${STATUSES.join(', ')}.` });
  }

  const info = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  if (info.changes === 0) return res.status(404).json({ error: 'Ordine non trovato.' });

  const { items_json, ...order } = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.json({ ...order, items: JSON.parse(items_json) });
});

module.exports = router;
