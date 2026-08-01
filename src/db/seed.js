const bcrypt = require('bcryptjs');
const db = require('./db');
const menuData = require('../data/menu.json');

function seedMenu() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM menu_items').get().c;
  if (count > 0) {
    console.log(`menu_items gia popolata (${count} piatti), skip.`);
    return;
  }
  const insert = db.prepare(`
    INSERT INTO menu_items (id, category, name, pieces, description, price, price_to_verify, frozen, treated, spicy, sort_order)
    VALUES (@id, @category, @name, @pieces, @description, @price, @priceToVerify, @frozen, @treated, @spicy, @sortOrder)
  `);
  const insertMany = db.transaction((items) => {
    items.forEach((item, index) => {
      insert.run({
        id: item.id,
        category: item.category,
        name: item.name,
        pieces: item.pieces || null,
        description: item.description || null,
        price: item.price === null || item.price === undefined ? null : item.price,
        priceToVerify: item.priceToVerify ? 1 : 0,
        frozen: item.frozen ? 1 : 0,
        treated: item.treated ? 1 : 0,
        spicy: item.spicy ? 1 : 0,
        sortOrder: index,
      });
    });
  });
  insertMany(menuData);
  console.log(`Inseriti ${menuData.length} piatti nel menu.`);
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
  if (existing) {
    console.log('Admin gia presente, skip.');
    return;
  }
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'akiko-nepi-2026';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Admin creato -> utente: ${username} / password: ${password} (CAMBIALA subito dal pannello!)`);
}

seedMenu();
seedAdmin();
