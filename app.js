const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const app = express();
const db = new Database('app.db');

function resetDb() {
  db.exec(`
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS users;
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      balance INTEGER
    );
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user INTEGER,
      to_user INTEGER,
      amount INTEGER,
      time TEXT DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO users (username, password, email, balance) VALUES
      ('alice', 'alice123', 'alice@example.com', 1000),
      ('bob', 'bob123', 'bob@example.com', 1000),
      ('attacker', 'attacker123', 'attacker@example.com', 0);
  `);
}

if (!db.prepare("SELECT name FROM sqlite_master WHERE name = 'users'").get()) resetDb();

app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
const prod = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: prod ? 'none' : 'lax', secure: prod, httpOnly: true }
}));

function currentUser(req) {
  if (!req.session.userId) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
}

function doTransfer(fromId, toName, amount) {
  const to = db.prepare('SELECT * FROM users WHERE username = ?').get(toName);
  if (!to || !(amount > 0)) return;
  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, fromId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, to.id);
  db.prepare('INSERT INTO transactions (from_user, to_user, amount) VALUES (?, ?, ?)').run(fromId, to.id, amount);
}

function render(req, res, data) {
  const user = currentUser(req);
  let logs = [];
  if (user) {
    logs = db.prepare(`
      SELECT t.amount, t.time, f.username AS fromName, g.username AS toName
      FROM transactions t
      JOIN users f ON f.id = t.from_user
      JOIN users g ON g.id = t.to_user
      WHERE t.from_user = ? OR t.to_user = ?
      ORDER BY t.id DESC LIMIT 10
    `).all(user.id, user.id);
  }
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(16).toString('hex');
  res.render('index', {
    sqli: req.session.sqli, csrfVuln: req.session.csrfVuln,
    results: null, error: null,
    user, logs, csrf: req.session.csrf, loginError: null,
    ...data
  });
}

app.get('/', (req, res) => {
  render(req, res);
});

app.post('/search', (req, res) => {
  const username = req.body.username || '';

  if (req.session.sqli) {
    const sql = "SELECT id, username, email, balance FROM users WHERE username = '" + username + "'";
    try {
      render(req, res, { results: db.prepare(sql).all() });
    } catch (err) {
      render(req, res, { error: 'Greška: ' + err.message + '\nUpit: ' + sql });
    }
  } else {
    if (!/^[a-zA-Z0-9_]{1,30}$/.test(username)) {
      return render(req, res, { error: 'Neispravan unos.' });
    }
    try {
      const results = db.prepare('SELECT id, username, email, balance FROM users WHERE username = ?').all(username);
      render(req, res, { results });
    } catch (err) {
      render(req, res, { error: 'Došlo je do pogreške.' });
    }
  }
});

app.post('/login', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?')
    .get(req.body.username || '', req.body.password || '');
  if (!user) return render(req, res, { loginError: 'Neispravni podaci.' });
  req.session.userId = user.id;
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  delete req.session.userId;
  res.redirect('/');
});

function handleTransfer(req, res) {
  const user = currentUser(req);
  if (!user) return res.status(401).send('Niste prijavljeni.');
  const b = req.body || {};
  doTransfer(user.id, b.to || req.query.to, Number(b.amount || req.query.amount));
  res.redirect('/');
}

// Vulnerable branch: GET or POST, no CSRF token check.
app.get('/transfer', (req, res) => {
  if (req.session.csrfVuln) return handleTransfer(req, res);
  res.status(405).send('Metoda nije dozvoljena.');
});

app.post('/transfer', (req, res) => {
  if (!req.session.csrfVuln) {
    if (!req.session.csrf || req.body.csrf !== req.session.csrf) {
      console.log('CSRF blokiran: ' + req.ip + ' ' + new Date().toISOString());
      return res.status(403).send('Neispravan CSRF token.');
    }
  }
  handleTransfer(req, res);
});

app.post('/toggle', (req, res) => {
  req.session.sqli = !!req.body.sqli;
  req.session.csrfVuln = !!req.body.csrfVuln;
  res.redirect('/');
});

app.post('/reset', (req, res) => {
  resetDb();
  req.session.destroy(() => res.redirect('/'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Listening on ' + port));
