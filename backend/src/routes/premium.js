const router = require('express').Router();
const auth   = require('../middleware/auth');
const pool   = require('../config/db');

router.get('/packages', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coin_packages');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
