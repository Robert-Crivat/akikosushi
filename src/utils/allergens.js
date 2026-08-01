const RULES = [
  [/farina|pane|panko|impanat|tempura|udon|tagliatelle|kataifi|grattugiat/, 'glutine'],
  [/salsa\s*soia|spaghetti di soia|gnocchi di riso|edamame|tofu|miso/, 'soia'],
  [/gamber|scampi|granchio|surimi/, 'crostacei'],
  [/\buov[ao]\b/, 'uova'],
  [/salmone|tonno|branzino|spigola|trancino|pesce/, 'pesce'],
  [/mandorl/, 'frutta a guscio'],
  [/sesamo/, 'sesamo'],
  [/philadelphia|formaggio|latte/, 'latte'],
  [/polpo|calamar|molluschi/, 'molluschi'],
];

const MEAT_FISH = /pollo|maiale|manzo|anatra|gamber|salmone|tonno|branzino|polpo|calamar|surimi|granchio|scampi|pesce|carne/;

function inferAllergens(item) {
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  const found = new Set();
  for (const [pattern, label] of RULES) {
    if (pattern.test(text)) found.add(label);
  }
  return Array.from(found);
}

function isVegetarian(item) {
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  if (!text) return false;
  return !MEAT_FISH.test(text);
}

module.exports = { inferAllergens, isVegetarian };
