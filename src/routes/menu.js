const express = require('express');
const db = require('../db/db');
const { inferAllergens, isVegetarian } = require('../utils/allergens');
const locations = require('../data/locations.json');

const router = express.Router();

function enrich(item) {
  return {
    ...item,
    frozen: !!item.frozen,
    treated: !!item.treated,
    spicy: !!item.spicy,
    priceToVerify: !!item.price_to_verify,
    vegetarian: isVegetarian(item),
    allergens: inferAllergens(item),
  };
}

router.get('/menu', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM menu_items WHERE available = 1 ORDER BY sort_order ASC')
    .all();
  res.json(rows.map(enrich));
});

router.get('/locations', (req, res) => {
  res.json(locations);
});

module.exports = router;
