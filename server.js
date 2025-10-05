// server.js - Sample Express backend with JWT auth & session endpoint
// NOTE: This is optional; front-end currently uses a mock API. Replace mockApi calls
// with real fetch requests pointing at these endpoints after starting this server.

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
// Optional Redis integration (uncomment if you add redis & ioredis/redis package)
// import { createClient } from 'redis';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// In-memory user + session store (replace with DB/Redis in production)
const users = new Map(); // username -> { username, passwordHash }
const sessions = new Map(); // username -> [sessionRecords]

// Example Redis setup (commented):
// const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
// redis.on('error', err => console.error('Redis error', err));
// await redis.connect();
// Later you could persist sessions: await redis.lPush(`user:${username}:sessions`, JSON.stringify(record));

function generateToken(user) {
  return jwt.sign({ sub: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

// Fake password hashing for demo; use bcrypt in production
function hash(pw) { return 'h$' + pw; }
function verify(pw, hashStr) { return hash(pw) === hashStr; }

app.post('/api/signup', (req, res) => {
  const { username, password, password2 } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (password !== password2) return res.status(400).json({ error: 'Passwords do not match' });
  if (users.has(username)) return res.status(409).json({ error: 'User exists' });
  users.set(username, { username, passwordHash: hash(password) });
  sessions.set(username, []);
  const token = generateToken({ username });
  res.json({ token, user: { username } });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.get(username);
  if (!user || !verify(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken({ username });
  res.json({ token, user: { username } });
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing auth header' });
  const token = auth.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.sub;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/session', authMiddleware, (req, res) => {
  const record = req.body.record;
  if (!record) return res.status(400).json({ error: 'Missing record' });
  const list = sessions.get(req.user) || [];
  list.unshift(record);
  if (list.length > 200) list.pop();
  sessions.set(req.user, list);
  res.json({ ok: true });
});

app.get('/api/session/history', authMiddleware, (req, res) => {
  const list = sessions.get(req.user) || [];
  res.json({ sessions: list.slice(0, 50) });
});

// Cached summary example (swap to Redis when available)
// app.get('/api/session/summary', authMiddleware, async (req, res) => {
//   const list = sessions.get(req.user) || [];
//   const avgWPM = list.reduce((a,s)=>a+s.wpm,0)/(list.length||1);
//   res.json({ count: list.length, avgWPM: Math.round(avgWPM) });
// });

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('API listening on :' + port));
