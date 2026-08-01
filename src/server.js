require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');

const app = express();

app.use(express.json());
app.use(
  cookieSession({
    name: 'akiko_session',
    keys: [process.env.SESSION_SECRET || 'dev-secret-cambia-in-produzione'],
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  })
);

app.use('/api', require('./routes/menu'));
app.use('/api', require('./routes/reservations'));
app.use('/api', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Errore interno del server.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Akiko Sushi in ascolto su http://localhost:${port}`);
});
