require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);
app.use(cors());
app.use('/webhook', express.raw({ type: 'application/json' }), require('./routes/webhook'));
app.use(express.json());

app.use('/auth',          require('./routes/auth'));
app.use('/users',         require('./routes/users'));
app.use('/calls',         require('./routes/calls'));
app.use('/rooms',         require('./routes/rooms'));
app.use('/wallet',        require('./routes/wallet'));
app.use('/premium',       require('./routes/premium'));
app.use('/notifications', require('./routes/notifications'));
app.use('/spin',          require('./routes/spin'));
app.use('/payment',       require('./routes/payment'));
app.use('/earnings',      require('./routes/earnings'));
app.use('/upload',        require('./routes/upload'));
app.use('/admin',         require('./routes/admin'));
app.use('/admin',         express.static(__dirname + '/../admin'));
app.use('/uploads',       express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));
app.get('/privacy',       (_, res) => res.sendFile(path.join(__dirname, '../public/privacy.html')));

app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

app.get('/dbtest', async (_, res) => {
  try {
    const pool = require('./config/db');
    const [tables] = await pool.query('SHOW TABLES');
    res.json({ db: 'ok', tables: tables.map(t => Object.values(t)[0]) });
  } catch (e) {
    res.status(500).json({ db: 'fail', error: e.message, code: e.code });
  }
});

require('./socket')(io);

// Auto-migrate missing columns so the app doesn't crash on fresh DB
async function runMigrations() {
  const pool = require('./config/db');
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS free_trial_used TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS intro_9_used TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE calls ADD COLUMN IF NOT EXISTS free_trial TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE calls ADD COLUMN IF NOT EXISTS girl_earnings_inr DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE calls ADD COLUMN IF NOT EXISTS platform_revenue_inr DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE calls ADD COLUMN IF NOT EXISTS girl_coins DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE earnings ADD COLUMN IF NOT EXISTS mins_received DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE earnings ADD COLUMN IF NOT EXISTS coins_received DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE earnings ADD COLUMN IF NOT EXISTS amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE earnings MODIFY COLUMN mins_received DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE earnings MODIFY COLUMN coins_received DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE earnings MODIFY COLUMN amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS gifts (
      id           CHAR(36)     PRIMARY KEY,
      sender_id    CHAR(36)     NOT NULL,
      receiver_id  CHAR(36)     NOT NULL,
      gift_type    VARCHAR(50)  NOT NULL,
      coins_spent  INT          NOT NULL,
      created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_receiver (receiver_id)
    )`,
    `CREATE TABLE IF NOT EXISTS reports (
      id           CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
      reporter_id  CHAR(36),
      reported_id  CHAR(36),
      reason       VARCHAR(200),
      status       VARCHAR(20)  DEFAULT 'pending',
      created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_reported (reported_id)
    )`,
    `CREATE TABLE IF NOT EXISTS blocks (
      id           CHAR(36)     PRIMARY KEY,
      blocker_id   CHAR(36)     NOT NULL,
      blocked_id   CHAR(36)     NOT NULL,
      created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_block (blocker_id, blocked_id),
      INDEX idx_blocker (blocker_id),
      INDEX idx_blocked (blocked_id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_ratings (
      id           CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
      rater_id     CHAR(36),
      rated_id     CHAR(36),
      call_id      CHAR(36),
      stars        TINYINT      DEFAULT 5,
      review_text  TEXT,
      tags         JSON,
      created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rated (rated_id),
      INDEX idx_rater (rater_id)
    )`,
    `CREATE TABLE IF NOT EXISTS wallet_transactions (
      id           CHAR(36)     PRIMARY KEY,
      user_id      CHAR(36)     NOT NULL,
      type         VARCHAR(30)  NOT NULL,
      amount       INT          NOT NULL,
      description  VARCHAR(255),
      created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_type (type)
    )`,
    `INSERT INTO coin_packages (id, coins, price_inr, label, is_popular) VALUES
      ('pack_9', 15, 9, '15 Coins (Trial)', 0),
      ('pack_100', 120, 100, '120 Coins (Basic)', 0),
      ('pack_200', 240, 200, '240 Coins (Standard)', 0),
      ('pack_500', 700, 500, '700 Coins (Premium)', 1)
     ON DUPLICATE KEY UPDATE coins=VALUES(coins), price_inr=VALUES(price_inr), label=VALUES(label), is_popular=VALUES(is_popular)`,
    `UPDATE calls 
     SET girl_earnings_inr = ROUND(mins_deducted * 0.70 * 0.50, 2),
         platform_revenue_inr = ROUND(mins_deducted * 0.30 * 0.50, 2),
         girl_coins = ROUND(mins_deducted * 0.70, 2)
     WHERE status = 'ended' AND free_trial = 0 AND mins_deducted > 0 AND (girl_earnings_inr = 0 OR girl_earnings_inr IS NULL)`,
    `INSERT INTO earnings (id, girl_id, call_id, mins_received, coins_received, amount_inr, created_at)
     SELECT UUID(), c.receiver_id, c.id, c.girl_coins, c.girl_coins, c.girl_earnings_inr, c.created_at
     FROM calls c
     WHERE c.status = 'ended' AND c.free_trial = 0 AND c.mins_deducted > 0 AND c.girl_earnings_inr > 0
       AND c.id NOT IN (SELECT COALESCE(call_id, '') FROM (SELECT call_id FROM earnings WHERE call_id IS NOT NULL) AS e)`,
    `UPDATE users u
     JOIN (
       SELECT girl_id, SUM(COALESCE(mins_received, coins_received, 0)) AS total_earned_coins
       FROM earnings
       GROUP BY girl_id
     ) e ON u.id = e.girl_id
     SET u.minutes = GREATEST(u.minutes, e.total_earned_coins)`,
  ];
  for (const sql of migrations) {
    try { await pool.query(sql); } catch (e) { console.warn('[Migration]', e.message); }
  }
  console.log('[Migration] Done');
}
runMigrations();

// A fresh server process has zero live socket connections — any is_online=1 left
// over from before a restart/sleep is stale (Render's free tier sleeps/restarts
// and wipes the in-memory socket map, but not this DB flag), which made users
// appear online with no way to actually receive a call. Reset on every boot.
(async () => {
  const pool = require('./config/db');
  try {
    const [result] = await pool.query('UPDATE users SET is_online=0 WHERE is_online=1');
    console.log(`[Startup] Reset is_online for ${result.affectedRows} stale user(s)`);
  } catch (e) { console.warn('[Startup] is_online reset failed:', e.message); }
})();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🍍 Pineapple backend running on port ${PORT}`));
