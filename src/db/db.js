const path = require('path');
const Database = require('better-sqlite3');

// DB_PATH permette di puntare a un disco persistente montato (es. Render),
// altrimenti resta accanto a questo file per lo sviluppo locale.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'akiko.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    pieces TEXT,
    description TEXT,
    price REAL,
    price_to_verify INTEGER NOT NULL DEFAULT 0,
    frozen INTEGER NOT NULL DEFAULT 0,
    treated INTEGER NOT NULL DEFAULT 0,
    spicy INTEGER NOT NULL DEFAULT 0,
    available INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    people INTEGER NOT NULL,
    location TEXT NOT NULL,
    res_date TEXT NOT NULL,
    res_time TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'in attesa',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    location TEXT NOT NULL,
    pickup_time TEXT NOT NULL,
    notes TEXT,
    items_json TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'in_sede',
    status TEXT NOT NULL DEFAULT 'ricevuto',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);
if (!orderColumns.includes('payment_method')) {
  db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'in_sede'");
}

module.exports = db;
