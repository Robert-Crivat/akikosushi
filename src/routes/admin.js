const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const BOOL_FIELDS = [
  ['priceToVerify', 'price_to_verify'],
  ['frozen', 'frozen'],
  ['treated', 'treated'],
  ['spicy', 'spicy'],
  ['available', 'available'],
];

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toBool(value) {
  if (value === '0' || value === 'false') return 0;
  return value ? 1 : 0;
}

router.post('/login', (req, res) => {
  const body = req.body || {};
  const username = str(body.username);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return res.status(400).json({ error: 'Inserisci utente e password.' });
  }

  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  // Stesso messaggio in entrambi i casi per non rivelare quali username esistono.
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenziali non valide.' });
  }

  req.session.adminId = user.id;
  req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: req.session.username });
});

router.post('/change-password', requireAdmin, (req, res) => {
  const body = req.body || {};
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.session.adminId);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Password attuale non corretta.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'La nuova password deve avere almeno 8 caratteri.' });
  }

  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(
    bcrypt.hashSync(newPassword, 10),
    user.id
  );
  res.json({ ok: true });
});

function parseMenuFields(body, partial) {
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const fields = {};

  if (!partial || has('category')) {
    const category = str(body.category);
    if (!category) return { error: 'La categoria è obbligatoria.' };
    fields.category = category;
  }
  if (!partial || has('name')) {
    const name = str(body.name);
    if (!name) return { error: 'Il nome del piatto è obbligatorio.' };
    fields.name = name;
  }
  if (has('pieces')) fields.pieces = str(body.pieces) || null;
  if (has('description')) fields.description = str(body.description) || null;
  if (has('price')) {
    if (body.price === null || body.price === '') {
      fields.price = null;
    } else {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) return { error: 'Prezzo non valido.' };
      fields.price = price;
    }
  }
  for (const [key, column] of BOOL_FIELDS) {
    if (has(key)) fields[column] = toBool(body[key]);
  }
  if (has('sortOrder')) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isInteger(sortOrder)) return { error: 'Ordinamento non valido.' };
    fields.sort_order = sortOrder;
  }

  return { fields };
}

const menu = express.Router();

menu.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM menu_items ORDER BY sort_order ASC, id ASC').all());
});

menu.post('/', (req, res) => {
  const body = req.body || {};
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'ID non valido: deve essere un intero maggiore di zero.' });
  }
  if (db.prepare('SELECT id FROM menu_items WHERE id = ?').get(id)) {
    return res.status(409).json({ error: 'Esiste già un piatto con questo ID.' });
  }

  const parsed = parseMenuFields(body, false);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const maxOrder = db.prepare('SELECT MAX(sort_order) AS m FROM menu_items').get().m;
  const row = {
    id,
    pieces: null,
    description: null,
    price: null,
    price_to_verify: 0,
    frozen: 0,
    treated: 0,
    spicy: 0,
    available: 1,
    sort_order: (maxOrder === null ? -1 : maxOrder) + 1,
    ...parsed.fields,
  };

  const columns = Object.keys(row);
  db.prepare(
    `INSERT INTO menu_items (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
  ).run(columns.map((column) => row[column]));

  res.status(201).json(db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id));
});

menu.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID non valido.' });
  if (!db.prepare('SELECT id FROM menu_items WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Piatto non trovato.' });
  }

  const parsed = parseMenuFields(req.body || {}, true);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const columns = Object.keys(parsed.fields);
  if (columns.length === 0) return res.status(400).json({ error: 'Nessun campo da aggiornare.' });

  const values = columns.map((column) => parsed.fields[column]);
  db.prepare(`UPDATE menu_items SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run([
    ...values,
    id,
  ]);

  res.json(db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id));
});

menu.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID non valido.' });

  const info = db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Piatto non trovato.' });

  res.json({ ok: true });
});

router.use('/menu', requireAdmin, menu);

module.exports = router;
