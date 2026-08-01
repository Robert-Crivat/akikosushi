const express = require('express');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const locations = require('../data/locations.json');

const router = express.Router();

const STATUSES = ['in attesa', 'confermata', 'rifiutata', 'completata'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isKnownLocation(slug) {
  return locations.some((loc) => loc.slug === slug);
}

router.post('/reservations', (req, res) => {
  const body = req.body || {};
  const name = str(body.name);
  const phone = str(body.phone);
  const email = str(body.email);
  const location = str(body.location);
  const date = str(body.date);
  const time = str(body.time);
  const notes = str(body.notes);
  const people = Number(body.people);

  if (!name) return res.status(400).json({ error: 'Il nome è obbligatorio.' });
  if (!phone) return res.status(400).json({ error: 'Il numero di telefono è obbligatorio.' });
  if (!Number.isInteger(people) || people < 1) {
    return res.status(400).json({ error: 'Il numero di persone deve essere un intero maggiore di zero.' });
  }
  if (!location) return res.status(400).json({ error: 'La sede è obbligatoria.' });
  if (!isKnownLocation(location)) return res.status(400).json({ error: 'Sede non valida.' });
  if (!DATE_RE.test(date)) return res.status(400).json({ error: 'Data non valida: usa il formato AAAA-MM-GG.' });
  if (!TIME_RE.test(time)) return res.status(400).json({ error: 'Orario non valido: usa il formato HH:MM.' });

  const info = db
    .prepare(`
      INSERT INTO reservations (name, phone, email, people, location, res_date, res_time, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(name, phone, email || null, people, location, date, time, notes || null);

  res.status(201).json({ id: info.lastInsertRowid, status: 'in attesa' });
});

router.get('/admin/reservations', requireAdmin, (req, res) => {
  const status = str(req.query.status);
  const rows = status
    ? db
        .prepare('SELECT * FROM reservations WHERE status = ? ORDER BY created_at DESC, id DESC')
        .all(status)
    : db.prepare('SELECT * FROM reservations ORDER BY created_at DESC, id DESC').all();
  res.json(rows);
});

router.patch('/admin/reservations/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID non valido.' });

  const status = str((req.body || {}).status);
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Stato non valido. Valori ammessi: ${STATUSES.join(', ')}.` });
  }

  const info = db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, id);
  if (info.changes === 0) return res.status(404).json({ error: 'Prenotazione non trovata.' });

  res.json(db.prepare('SELECT * FROM reservations WHERE id = ?').get(id));
});

module.exports = router;
