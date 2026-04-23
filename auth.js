import { Router } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, area, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const rows = await sql`
      INSERT INTO users (name, email, password, area, phone)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${hash}, ${area || null}, ${phone || null})
      RETURNING id, name, email, area, phone, created_at
    `;
    req.session.user = rows[0];
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('duplicate'))
      return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });
  try {
    const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()}`;
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const { password: _, ...safeUser } = user;
    req.session.user = safeUser;
    res.json({ user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('fs_sid');
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, name, email, area, phone, created_at FROM users WHERE id = ${req.user.id}
    `;
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
