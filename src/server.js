require('dotenv').config();

const express = require('express');
const cookieSession = require('cookie-session');

const app = express();

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(
  cookieSession({
    name: 'akiko_session',
    keys: [process.env.SESSION_SECRET || 'dev-secret-cambia-in-produzione'],
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  })
);

app.get('/', (req, res) => res.json({ status: 'ok', service: 'akikosushi-api' }));

app.use('/api', require('./routes/menu'));
app.use('/api', require('./routes/reservations'));
app.use('/api', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Errore interno del server.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Akiko Sushi in ascolto su http://localhost:${port}`);
});
