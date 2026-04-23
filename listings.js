import { Router } from 'express';
import sql from '../db/client.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/listings
router.get('/', optionalAuth, async (req, res) => {
  const { type, category } = req.query;
  try {
    const rows = await sql`
      SELECT l.*, u.name as user_name
      FROM listings l JOIN users u ON u.id = l.user_id
      WHERE l.status = 'available'
        AND (${type ?? null} IS NULL OR l.type = ${type ?? null})
        AND (${category ?? null} IS NULL OR l.category = ${category ?? null})
      ORDER BY l.created_at DESC
    `;
    res.json({ listings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/stats
router.get('/stats', async (req, res) => {
  try {
    const rows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE type='donate' AND status='available') AS donations,
        COUNT(*) FILTER (WHERE type='request' AND status='available') AS requests,
        COUNT(*) FILTER (WHERE status='claimed') AS claimed
      FROM listings
    `;
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/listings/mine
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT l.*, u.name as user_name
      FROM listings l JOIN users u ON u.id = l.user_id
      WHERE l.user_id = ${req.user.id}
      ORDER BY l.created_at DESC
    `;
    res.json({ listings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch your listings' });
  }
});

// POST /api/listings
router.post('/', requireAuth, async (req, res) => {
  const { type, title, description, category, area, expiry } = req.body;
  if (!type || !title || !category || !area)
    return res.status(400).json({ error: 'type, title, category and area are required' });
  if (!['donate', 'request'].includes(type))
    return res.status(400).json({ error: 'type must be donate or request' });
  try {
    const rows = await sql`
      INSERT INTO listings (user_id, type, title, description, category, area, expiry)
      VALUES (${req.user.id}, ${type}, ${title.trim()}, ${description || null}, ${category}, ${area.trim()}, ${expiry || 'Flexible'})
      RETURNING *
    `;
    res.status(201).json({ listing: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PATCH /api/listings/:id/claim
router.patch('/:id/claim', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await sql`SELECT * FROM listings WHERE id = ${id}`;
    if (!existing[0]) return res.status(404).json({ error: 'Listing not found' });
    if (existing[0].status === 'claimed') return res.status(409).json({ error: 'Already claimed' });
    if (existing[0].user_id === req.user.id) return res.status(400).json({ error: 'Cannot claim your own listing' });
    const rows = await sql`
      UPDATE listings SET status = 'claimed', claimed_by = ${req.user.id}, updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    res.json({ listing: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to claim listing' });
  }
});

// DELETE /api/listings/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await sql`SELECT * FROM listings WHERE id = ${id}`;
    if (!existing[0]) return res.status(404).json({ error: 'Listing not found' });
    if (existing[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });
    await sql`DELETE FROM listings WHERE id = ${id}`;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

export default router;
