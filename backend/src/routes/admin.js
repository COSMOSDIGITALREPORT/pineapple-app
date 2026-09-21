const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool   = require('../config/db');

function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// POST /admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// POST /admin/migrate-verification-and-withdrawals — one-off: adds same_day/fee_amount
// columns to withdrawals if missing, and marks all existing girls as verified so the
// new verification gate doesn't hide anyone who was already live before this feature shipped.
router.post('/migrate-verification-and-withdrawals', adminAuth, async (req, res) => {
  const log = [];
  try {
    try {
      await pool.query('ALTER TABLE withdrawals ADD COLUMN same_day TINYINT(1) NOT NULL DEFAULT 0');
      log.push('added same_day column');
    } catch (e) { log.push('same_day column: ' + e.message); }
    try {
      await pool.query('ALTER TABLE withdrawals ADD COLUMN fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0');
      log.push('added fee_amount column');
    } catch (e) { log.push('fee_amount column: ' + e.message); }

    const [result] = await pool.query("UPDATE users SET is_verified=1 WHERE gender='girl' AND is_verified=0");
    log.push(`approved ${result.affectedRows} existing girls`);

    res.json({ success: true, log });
  } catch (err) { res.status(500).json({ error: err.message, log }); }
});

// GET /admin/stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [[users]]   = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [[boys]]    = await pool.query('SELECT COUNT(*) AS total FROM users WHERE gender IN ("boy","male")');
    const [[girls]]   = await pool.query('SELECT COUNT(*) AS total FROM users WHERE gender IN ("girl","female")');
    const [[online]]  = await pool.query('SELECT COUNT(*) AS total FROM users WHERE is_online=1');
    const [[calls]]   = await pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(mins_deducted),0) AS total_coins,
              COALESCE(SUM(duration_seconds),0) AS total_secs,
              COALESCE(SUM(platform_revenue_inr),0) AS call_platform_rev,
              COALESCE(SUM(girl_earnings_inr),0) AS call_girl_earnings
       FROM calls WHERE status="ended"`
    );
    const [[earnings]] = await pool.query('SELECT COALESCE(SUM(amount_inr),0) AS total_girl_earned FROM earnings');
    const [[pending]]  = await pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS total_amount FROM withdrawals WHERE status="pending"');
    const [[paidOut]]  = await pool.query('SELECT COALESCE(SUM(amount),0) AS total_paid FROM withdrawals WHERE status="approved"');
    const [[reports]]  = await pool.query('SELECT COUNT(*) AS total FROM reports WHERE status="pending"');
    const [[unverified]] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE gender="girl" AND is_verified=0');
    let pendingSupport = { total: 0 };
    try {
      const [[sp]] = await pool.query('SELECT COUNT(DISTINCT user_id) AS total FROM support_messages WHERE sender_type="user" AND status="pending"');
      if (sp) pendingSupport = sp;
    } catch {}

    let giftsCoins = 0;
    try {
      const [[giftsSummary]] = await pool.query(
        'SELECT COALESCE(SUM(coins_spent), 0) AS total_gift_coins FROM gifts'
      );
      giftsCoins = Number(giftsSummary?.total_gift_coins) || 0;
    } catch (_) {}

    const totalCallCoins = Number(calls.total_coins) || 0;
    const totalCoinsSpent = totalCallCoins + giftsCoins;
    const callPlatformRev = parseFloat(calls.call_platform_rev) || 0;
    const giftPlatformRev = parseFloat((giftsCoins * 0.33).toFixed(2));
    const totalPlatformRev = parseFloat((callPlatformRev + giftPlatformRev).toFixed(2));

    const recordedCallGirlEarnings = parseFloat(calls.call_girl_earnings) || 0;
    const giftGirlEarningsInr = parseFloat((giftsCoins * 0.50).toFixed(2));
    const totalGirlEarnings = Math.max(parseFloat(earnings.total_girl_earned) || 0, recordedCallGirlEarnings + giftGirlEarningsInr);
    const totalPaid = parseFloat(paidOut?.total_paid) || 0;
    const unpaidHostBalance = Math.max(0, Math.round((totalGirlEarnings - totalPaid) * 100) / 100);

    const pendingWithdrawalAmount = parseFloat(pending.total_amount) || 0;
    const totalMinsTalked = Math.round((Number(calls.total_secs) || 0) / 60);

    res.json({
      users: users.total,
      boys: boys.total,
      girls: girls.total,
      online: online.total,
      totalCalls: calls.total,
      totalMins: totalMinsTalked,
      totalCoins: totalCoinsSpent,
      platformRevenue: totalPlatformRev,
      girlEarnings: totalGirlEarnings,
      unpaidHostBalance: unpaidHostBalance,
      pendingWithdrawalAmount,
      pendingWithdrawals: pending.total,
      pendingReports: reports.total,
      pendingVerifications: unverified.total,
      pendingSupportQueries: pendingSupport.total || 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/hosts — Dedicated Host-Wise Earnings & Accounts
router.get('/hosts', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.phone, 
        u.avatar_url, 
        u.city,
        u.is_online,
        u.is_verified,
        u.is_blocked,
        u.rating,
        u.minutes AS wallet_coins,
        u.created_at,
        COALESCE(e.total_earned_inr, 0) AS total_earned_inr,
        COALESCE(e.total_earned_coins, 0) AS total_earned_coins,
        COALESCE(c.total_calls, 0) AS total_calls,
        COALESCE(c.total_call_secs, 0) AS total_call_secs,
        COALESCE(c.call_earned_inr, 0) AS call_earned_inr,
        COALESCE(w_app.paid_out, 0) AS total_paid_out,
        COALESCE(w_pen.pending_payout, 0) AS pending_payout,
        (GREATEST(COALESCE(e.total_earned_inr, 0), COALESCE(c.call_earned_inr, 0)) - COALESCE(w_app.paid_out, 0)) AS unpaid_balance
      FROM users u
      LEFT JOIN (
        SELECT girl_id, 
               SUM(amount_inr) AS total_earned_inr,
               SUM(COALESCE(mins_received, coins_received, 0)) AS total_earned_coins
        FROM earnings GROUP BY girl_id
      ) e ON u.id = e.girl_id
      LEFT JOIN (
        SELECT receiver_id, 
               COUNT(*) AS total_calls, 
               SUM(duration_seconds) AS total_call_secs, 
               SUM(girl_earnings_inr) AS call_earned_inr
        FROM calls WHERE status='ended' GROUP BY receiver_id
      ) c ON u.id = c.receiver_id
      LEFT JOIN (
        SELECT girl_id, SUM(amount) AS paid_out FROM withdrawals WHERE status='approved' GROUP BY girl_id
      ) w_app ON u.id = w_app.girl_id
      LEFT JOIN (
        SELECT girl_id, SUM(amount) AS pending_payout FROM withdrawals WHERE status='pending' GROUP BY girl_id
      ) w_pen ON u.id = w_pen.girl_id
      WHERE u.gender IN ('girl', 'female')
      ORDER BY unpaid_balance DESC, total_earned_inr DESC, u.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,phone,name,gender,minutes,is_online,is_blocked,is_premium,is_verified,rating,created_at FROM users ORDER BY created_at DESC LIMIT 200');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/users/pending — girls awaiting verification approval
router.get('/users/pending', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,phone,name,city,language,bio,avatar_url,dob,created_at FROM users
       WHERE gender='girl' AND is_verified=0 ORDER BY created_at DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/users/:id/verify — approve/reject a girl's profile
router.put('/users/:id/verify', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_verified=? WHERE id=?', [req.body.verify ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/users/:id/gender — update user gender (boy / girl)
router.put('/users/:id/gender', adminAuth, async (req, res) => {
  const { gender } = req.body;
  if (!gender || !['boy', 'girl', 'male', 'female'].includes(gender.toLowerCase())) {
    return res.status(400).json({ error: 'Valid gender (boy or girl) required' });
  }
  try {
    await pool.query('UPDATE users SET gender=? WHERE id=?', [gender.toLowerCase(), req.params.id]);
    res.json({ success: true, gender: gender.toLowerCase() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /admin/fix-genders — auto-fix any null/missing genders
router.post('/fix-genders', adminAuth, async (req, res) => {
  try {
    const [result] = await pool.query("UPDATE users SET gender='girl' WHERE gender IS NULL OR gender='' OR gender='-'");
    res.json({ success: true, updated: result.affectedRows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/users/:id/coins — add coins
router.put('/users/:id/coins', adminAuth, async (req, res) => {
  const { coins } = req.body;
  if (!coins || isNaN(coins)) return res.status(400).json({ error: 'coins required' });
  try {
    await pool.query('UPDATE users SET minutes=minutes+? WHERE id=?', [parseInt(coins), req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/users/:id/block — suspend/unsuspend
router.put('/users/:id/block', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_blocked=? WHERE id=?', [req.body.block ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /admin/users/:id — delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/withdrawals
router.get('/withdrawals', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT w.*, u.name, u.phone FROM withdrawals w JOIN users u ON w.girl_id=u.id ORDER BY w.created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/withdrawals/:id — approve/reject
router.put('/withdrawals/:id', adminAuth, async (req, res) => {
  const { status, note } = req.body;
  try {
    await pool.query('UPDATE withdrawals SET status=?, note=? WHERE id=?', [status, note||null, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/reports
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const statusFilter = req.query.status;
    let q = `SELECT r.*, 
                    u1.name AS reporter_name, u1.phone AS reporter_phone,
                    u2.name AS reported_name, u2.phone AS reported_phone, u2.is_blocked AS reported_is_blocked
             FROM reports r
             LEFT JOIN users u1 ON r.reporter_id=u1.id
             LEFT JOIN users u2 ON r.reported_id=u2.id`;
    const params = [];
    if (statusFilter && statusFilter !== 'all') {
      q += ' WHERE r.status=?';
      params.push(statusFilter);
    }
    q += ' ORDER BY CASE WHEN r.status="pending" THEN 0 ELSE 1 END, r.created_at DESC LIMIT 200';
    const [rows] = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /admin/reports/resolve-all — settle all pending reports in 1 click
router.post('/reports/resolve-all', adminAuth, async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE reports SET status="resolved" WHERE status="pending"');
    res.json({ success: true, updated: result.affectedRows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/reports/:id
router.put('/reports/:id', adminAuth, async (req, res) => {
  const { status, suspendUser } = req.body;
  try {
    await pool.query('UPDATE reports SET status=? WHERE id=?', [status || 'resolved', req.params.id]);
    if (suspendUser) {
      const [rows] = await pool.query('SELECT reported_id FROM reports WHERE id=?', [req.params.id]);
      if (rows.length && rows[0].reported_id) {
        await pool.query('UPDATE users SET is_blocked=1 WHERE id=?', [rows[0].reported_id]);
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /admin/reports/:id
router.delete('/reports/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM reports WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/financials — Full economics ledger (Inflow, Outflow, Platform Share, Host Share, Gifts, Coin usage)
router.get('/financials', adminAuth, async (req, res) => {
  try {
    // 1. Coin Purchases & Inflow
    const [[purchases]] = await pool.query(
      `SELECT COUNT(*) AS total_purchases,
              COALESCE(SUM(amount), 0) AS total_coins_purchased
       FROM wallet_transactions WHERE type='purchase'`
    );

    // Approximate INR based on purchase records or descriptions
    const [purchaseRows] = await pool.query(
      `SELECT description, amount, created_at FROM wallet_transactions WHERE type='purchase'`
    );
    let estimatedGrossInflowInr = 0;
    const packCounts = { pack_9: 0, pack_100: 0, pack_200: 0, pack_500: 0, custom: 0 };
    for (const p of purchaseRows) {
      const desc = p.description || '';
      if (desc.includes('₹9') || p.amount === 15) { estimatedGrossInflowInr += 9; packCounts.pack_9++; }
      else if (desc.includes('₹100') || p.amount === 120) { estimatedGrossInflowInr += 100; packCounts.pack_100++; }
      else if (desc.includes('₹200') || p.amount === 240) { estimatedGrossInflowInr += 200; packCounts.pack_200++; }
      else if (desc.includes('₹500') || p.amount === 700) { estimatedGrossInflowInr += 500; packCounts.pack_500++; }
      else {
        const inr = Math.round(p.amount * 0.83);
        estimatedGrossInflowInr += inr;
        packCounts.custom++;
      }
    }

    // 2. Call Consumption & Revenue
    const [[callsStats]] = await pool.query(
      `SELECT COUNT(*) AS total_ended_calls,
              COALESCE(SUM(mins_deducted), 0) AS total_call_coins,
              COALESCE(SUM(duration_seconds), 0) AS total_call_secs,
              COALESCE(SUM(platform_revenue_inr), 0) AS call_platform_rev,
              COALESCE(SUM(girl_earnings_inr), 0) AS call_girl_earnings
       FROM calls WHERE status='ended'`
    );

    const [[audioCalls]] = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(mins_deducted),0) AS coins, COALESCE(SUM(girl_earnings_inr),0) AS girl_inr, COALESCE(SUM(platform_revenue_inr),0) AS plat_inr FROM calls WHERE status='ended' AND call_type='audio'`
    );
    const [[videoCalls]] = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(mins_deducted),0) AS coins, COALESCE(SUM(girl_earnings_inr),0) AS girl_inr, COALESCE(SUM(platform_revenue_inr),0) AS plat_inr FROM calls WHERE status='ended' AND call_type='video'`
    );

    // 3. Gift Consumption & Revenue
    let giftsCount = 0, giftsCoins = 0, giftTypes = [], recentGifts = [];
    try {
      const [[giftsSummary]] = await pool.query(
        `SELECT COUNT(*) AS total_gifts, COALESCE(SUM(coins_spent), 0) AS total_gift_coins FROM gifts`
      );
      giftsCount = giftsSummary.total_gifts || 0;
      giftsCoins = Number(giftsSummary.total_gift_coins) || 0;

      const [gtRows] = await pool.query(
        `SELECT gift_type, COUNT(*) AS count, COALESCE(SUM(coins_spent),0) AS coins FROM gifts GROUP BY gift_type ORDER BY coins DESC`
      );
      giftTypes = gtRows;

      const [rgRows] = await pool.query(
        `SELECT g.id, g.gift_type, g.coins_spent, g.created_at,
                u1.name AS sender_name, u1.gender AS sender_gender,
                u2.name AS receiver_name
         FROM gifts g
         LEFT JOIN users u1 ON g.sender_id=u1.id
         LEFT JOIN users u2 ON g.receiver_id=u2.id
         ORDER BY g.created_at DESC LIMIT 50`
      );
      recentGifts = rgRows;
    } catch (e) { console.warn('Gifts query:', e.message); }

    const giftGirlEarningsInr = parseFloat((giftsCoins * 0.5).toFixed(2));
    const giftPlatformRevInr = parseFloat((giftsCoins * 0.33).toFixed(2));

    // 4. Host Earnings & Withdrawals
    const [[totalEarnings]] = await pool.query('SELECT COALESCE(SUM(amount_inr),0) AS total FROM earnings');
    const [[payoutsApproved]] = await pool.query('SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total FROM withdrawals WHERE status="approved"');
    const [[payoutsPending]] = await pool.query('SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total FROM withdrawals WHERE status="pending"');

    // 5. Circulating Wallet Balances
    const [[boysCoins]] = await pool.query('SELECT COALESCE(SUM(minutes),0) AS total FROM users WHERE gender IN ("boy","male")');
    const [[girlsCoins]] = await pool.query('SELECT COALESCE(SUM(minutes),0) AS total FROM users WHERE gender IN ("girl","female")');

    const totalCoinsConsumed = (Number(callsStats.total_call_coins) || 0) + giftsCoins;
    const recordedCallGirlEarnings = parseFloat(callsStats.call_girl_earnings) || 0;
    const totalGirlEarnings = Math.max(parseFloat(totalEarnings.total) || 0, recordedCallGirlEarnings + giftGirlEarningsInr);
    const totalPlatformRev = parseFloat(((parseFloat(callsStats.call_platform_rev) || 0) + giftPlatformRevInr).toFixed(2));
    const totalPaidOut = parseFloat(payoutsApproved.total) || 0;
    const totalPendingPayout = parseFloat(payoutsPending.total) || 0;
    const unpaidHostBalance = Math.max(0, Math.round((totalGirlEarnings - totalPaidOut) * 100) / 100);

    // 6. Host-Wise Earnings Breakdown
    const [hostBreakdown] = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.phone, 
        u.avatar_url, 
        u.city,
        u.is_online,
        u.is_verified,
        u.minutes AS wallet_coins,
        COALESCE(e.total_earned_inr, 0) AS total_earned_inr,
        COALESCE(e.total_earned_coins, 0) AS total_earned_coins,
        COALESCE(c.total_calls, 0) AS total_calls,
        COALESCE(c.total_call_secs, 0) AS total_call_secs,
        COALESCE(c.call_earned_inr, 0) AS call_earned_inr,
        COALESCE(w_app.paid_out, 0) AS total_paid_out,
        COALESCE(w_pen.pending_payout, 0) AS pending_payout,
        (GREATEST(COALESCE(e.total_earned_inr, 0), COALESCE(c.call_earned_inr, 0)) - COALESCE(w_app.paid_out, 0)) AS unpaid_balance
      FROM users u
      LEFT JOIN (
        SELECT girl_id, 
               SUM(amount_inr) AS total_earned_inr,
               SUM(COALESCE(mins_received, coins_received, 0)) AS total_earned_coins
        FROM earnings GROUP BY girl_id
      ) e ON u.id = e.girl_id
      LEFT JOIN (
        SELECT receiver_id, 
               COUNT(*) AS total_calls, 
               SUM(duration_seconds) AS total_call_secs, 
               SUM(girl_earnings_inr) AS call_earned_inr
        FROM calls WHERE status='ended' GROUP BY receiver_id
      ) c ON u.id = c.receiver_id
      LEFT JOIN (
        SELECT girl_id, SUM(amount) AS paid_out FROM withdrawals WHERE status='approved' GROUP BY girl_id
      ) w_app ON u.id = w_app.girl_id
      LEFT JOIN (
        SELECT girl_id, SUM(amount) AS pending_payout FROM withdrawals WHERE status='pending' GROUP BY girl_id
      ) w_pen ON u.id = w_pen.girl_id
      WHERE u.gender IN ('girl', 'female')
      ORDER BY unpaid_balance DESC, total_earned_inr DESC, u.created_at DESC
    `);

    // 7. Recent Transaction Ledger Feed with Full Party Mapping
    const [recentTxns] = await pool.query(
      `SELECT t.id, t.user_id, t.type, t.amount, t.description, t.created_at, t.ref_id,
              u.name AS user_name, u.gender AS user_gender, u.phone AS user_phone,
              c.receiver_id AS call_receiver_id,
              u_rec.name AS receiver_name,
              u_rec.phone AS receiver_phone
       FROM wallet_transactions t
       LEFT JOIN users u ON t.user_id=u.id
       LEFT JOIN calls c ON t.ref_id=c.id
       LEFT JOIN users u_rec ON c.receiver_id=u_rec.id
       ORDER BY t.created_at DESC LIMIT 200`
    );

    res.json({
      inflow: {
        totalPurchases: purchases.total_purchases || 0,
        totalCoinsPurchased: Number(purchases.total_coins_purchased) || 0,
        estimatedGrossInflowInr,
        packCounts,
      },
      consumption: {
        totalCoinsConsumed,
        callCoins: Number(callsStats.total_call_coins) || 0,
        totalCallSecs: Number(callsStats.total_call_secs) || 0,
        audioCalls: { count: audioCalls.count, coins: Number(audioCalls.coins), girlInr: parseFloat(audioCalls.girl_inr), platInr: parseFloat(audioCalls.plat_inr) },
        videoCalls: { count: videoCalls.count, coins: Number(videoCalls.coins), girlInr: parseFloat(videoCalls.girl_inr), platInr: parseFloat(videoCalls.plat_inr) },
        giftCoins: giftsCoins,
        giftsCount,
        giftTypes,
      },
      economics: {
        platformRevenue: totalPlatformRev,
        girlEarnings: totalGirlEarnings,
        callPlatformRev: parseFloat(callsStats.call_platform_rev) || 0,
        callGirlEarnings: parseFloat(callsStats.call_girl_earnings) || 0,
        giftPlatformRev: giftPlatformRevInr,
        giftGirlEarnings: giftGirlEarningsInr,
        totalPaidOut,
        totalPendingPayout,
        unpaidHostBalance,
        boysWalletCoins: Number(boysCoins.total) || 0,
        girlsWalletCoins: Number(girlsCoins.total) || 0,
        netPlatformProfit: Math.max(0, estimatedGrossInflowInr - totalPaidOut),
      },
      hosts: hostBreakdown,
      recentGifts,
      recentTxns,
    });
  } catch (err) {
    console.error('financials error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/calls
router.get('/calls', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.call_type, c.duration_seconds, c.mins_deducted,
              COALESCE(c.girl_earnings_inr, 0) AS girl_earnings_inr,
              COALESCE(c.platform_revenue_inr, 0) AS platform_revenue_inr,
              COALESCE(c.free_trial, 0) AS free_trial,
              c.status, c.created_at,
              u1.name AS caller, u2.name AS receiver
       FROM calls c
       LEFT JOIN users u1 ON c.caller_id=u1.id
       LEFT JOIN users u2 ON c.receiver_id=u2.id
       ORDER BY c.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/reviews — all reviews & ratings (star ratings, tags, text feedback)
router.get('/reviews', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.stars, r.review_text, r.tags, r.created_at,
              COALESCE(rater.name, 'User') AS rater_name,
              COALESCE(rater.gender, 'boy') AS rater_gender,
              COALESCE(rater.phone, '') AS rater_phone,
              COALESCE(rated.name, 'User') AS rated_name,
              COALESCE(rated.gender, 'girl') AS rated_gender,
              COALESCE(rated.phone, '') AS rated_phone
       FROM user_ratings r
       LEFT JOIN users rater ON r.rater_id=rater.id
       LEFT JOIN users rated ON r.rated_id=rated.id
       ORDER BY r.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /admin/reviews/:id — delete review
router.delete('/reviews/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM user_ratings WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /admin/seed-girls — one-time seed of demo girl profiles for testing (idempotent by phone prefix)
const SEED_GIRLS = [
  { phone: '9999900001', name: 'Asmi',    city: 'Delhi',     language: 'Hindi',   rating: 4.9, rating_count: 210, is_online: 1, calls: 2100, avatar_url: 'https://i.pravatar.cc/300?img=47' },
  { phone: '9999900002', name: 'Priya',   city: 'Mumbai',    language: 'Hindi',   rating: 4.8, rating_count: 180, is_online: 1, calls: 1800, avatar_url: 'https://i.pravatar.cc/300?img=44' },
  { phone: '9999900003', name: 'Ananya',  city: 'Bangalore', language: 'English', rating: 4.7, rating_count: 150, is_online: 0, calls: 1500, avatar_url: 'https://i.pravatar.cc/300?img=45' },
  { phone: '9999900004', name: 'Kavya',   city: 'Pune',      language: 'Hindi',   rating: 4.6, rating_count: 120, is_online: 1, calls: 1200, avatar_url: 'https://i.pravatar.cc/300?img=48' },
  { phone: '9999900005', name: 'Riya',    city: 'Jaipur',    language: 'Hindi',   rating: 4.5, rating_count: 95,  is_online: 0, calls: 950,  avatar_url: 'https://i.pravatar.cc/300?img=49' },
  { phone: '9999900006', name: 'Sneha',   city: 'Chennai',   language: 'English', rating: 4.4, rating_count: 80,  is_online: 1, calls: 800,  avatar_url: 'https://i.pravatar.cc/300?img=32' },
  { phone: '9999900007', name: 'Isha',    city: 'Kolkata',   language: 'Hindi',   rating: 4.3, rating_count: 60,  is_online: 0, calls: 600,  avatar_url: 'https://i.pravatar.cc/300?img=31' },
  { phone: '9999900008', name: 'Meera',   city: 'Lucknow',   language: 'Hindi',   rating: 4.1, rating_count: 40,  is_online: 1, calls: 400,  avatar_url: 'https://i.pravatar.cc/300?img=30' },
  { phone: '9999900009', name: 'Tara',    city: 'Ahmedabad', language: 'English', rating: 4.0, rating_count: 25,  is_online: 0, calls: 250,  avatar_url: 'https://i.pravatar.cc/300?img=29' },
];

router.post('/seed-girls', adminAuth, async (req, res) => {
  try {
    const created = [];
    for (const g of SEED_GIRLS) {
      const [existing] = await pool.query('SELECT id FROM users WHERE phone=?', [g.phone]);
      let userId;
      if (existing.length) {
        userId = existing[0].id;
        await pool.query(
          `UPDATE users SET name=?, city=?, language=?, gender='girl', rating=?, rating_count=?,
             is_online=?, avatar_url=?, is_verified=1 WHERE id=?`,
          [g.name, g.city, g.language, g.rating, g.rating_count, g.is_online, g.avatar_url, userId]
        );
      } else {
        userId = uuidv4();
        await pool.query(
          `INSERT INTO users (id, phone, name, gender, city, language, rating, rating_count, is_online, avatar_url, is_verified, minutes)
           VALUES (?,?,?,?,?,?,?,?,?,?,1,0)`,
          [userId, g.phone, g.name, 'girl', g.city, g.language, g.rating, g.rating_count, g.is_online, g.avatar_url]
        );
      }
      // Backfill ended calls so calls_count reflects the seeded number (single bulk insert)
      const [[{ cnt }]] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM calls WHERE receiver_id=? AND status='ended'", [userId]
      );
      const toAdd = Math.max(0, g.calls - cnt);
      if (toAdd > 0) {
        const rows = Array.from({ length: toAdd }, () => [uuidv4(), null, userId, 'audio', 'ended', 60]);
        await pool.query(
          `INSERT INTO calls (id, caller_id, receiver_id, call_type, status, duration_seconds) VALUES ?`,
          [rows]
        );
      }
      created.push({ id: userId, name: g.name });
    }
    res.json({ success: true, seeded: created });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /admin/seed-girls — remove the demo girl profiles (and their backfilled calls) added above
router.delete('/seed-girls', adminAuth, async (req, res) => {
  try {
    const removed = [];
    for (const g of SEED_GIRLS) {
      const [existing] = await pool.query('SELECT id FROM users WHERE phone=?', [g.phone]);
      if (!existing.length) continue;
      const userId = existing[0].id;
      await pool.query('DELETE FROM calls WHERE receiver_id=? OR caller_id=?', [userId, userId]);
      await pool.query('DELETE FROM user_ratings WHERE rater_id=? OR rated_id=?', [userId, userId]);
      await pool.query('DELETE FROM users WHERE id=?', [userId]);
      removed.push({ id: userId, name: g.name });
    }
    res.json({ success: true, removed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /admin/reconcile-earnings — recalculate & backfill host earnings and ledger records
router.post('/reconcile-earnings', adminAuth, async (req, res) => {
  try {
    // 1. Calculate and update any ended call where coins were spent
    await pool.query(
      `UPDATE calls 
       SET girl_earnings_inr = ROUND(mins_deducted * 0.70 * 0.50, 2),
           platform_revenue_inr = ROUND(mins_deducted * 0.30 * 0.50, 2),
           girl_coins = ROUND(mins_deducted * 0.70, 2)
       WHERE status = 'ended' AND free_trial = 0 AND mins_deducted > 0`
    );

    // 2. Insert missing earnings
    await pool.query(
      `INSERT INTO earnings (id, girl_id, call_id, mins_received, coins_received, amount_inr, created_at)
       SELECT UUID(), c.receiver_id, c.id, c.girl_coins, c.girl_coins, c.girl_earnings_inr, c.created_at
       FROM calls c
       WHERE c.status = 'ended' AND c.free_trial = 0 AND c.mins_deducted > 0 AND c.girl_earnings_inr > 0
         AND c.id NOT IN (SELECT COALESCE(call_id, '') FROM (SELECT call_id FROM earnings WHERE call_id IS NOT NULL) AS e)`
    );

    // 3. Backfill wallet transactions for girl earnings if missing
    await pool.query(
      `INSERT INTO wallet_transactions (id, user_id, type, amount, description, ref_id, created_at)
       SELECT UUID(), c.receiver_id, 'earn', c.girl_coins, CONCAT(c.call_type, ' call earnings (₹', c.girl_earnings_inr, ')'), c.id, c.ended_at
       FROM calls c
       WHERE c.status = 'ended' AND c.free_trial = 0 AND c.mins_deducted > 0 AND c.girl_coins > 0
         AND c.id NOT IN (SELECT COALESCE(ref_id, '') FROM (SELECT ref_id FROM wallet_transactions WHERE type='earn' AND ref_id IS NOT NULL) AS w)`
    );

    // 4. Update girls' wallet balance
    await pool.query(
      `UPDATE users u
       JOIN (
         SELECT girl_id, SUM(COALESCE(mins_received, coins_received, 0)) AS total_earned_coins
         FROM earnings
         GROUP BY girl_id
       ) e ON u.id = e.girl_id
       SET u.minutes = GREATEST(u.minutes, e.total_earned_coins)`
    );

    res.json({ success: true, message: 'Earnings reconciled successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CHATBOT & USER SUPPORT ──────────────────────────────────────────────────

// GET /admin/support/conversations — list all user support threads
router.get('/support/conversations', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id AS user_id,
        u.name,
        u.phone,
        u.avatar_url,
        u.gender,
        u.minutes AS coins,
        u.is_online,
        u.created_at AS joined_at,
        MAX(sm.created_at) AS last_message_at,
        (
          SELECT message FROM support_messages 
          WHERE user_id = u.id 
          ORDER BY created_at DESC LIMIT 1
        ) AS last_message,
        (
          SELECT sender_type FROM support_messages 
          WHERE user_id = u.id 
          ORDER BY created_at DESC LIMIT 1
        ) AS last_sender,
        (
          SELECT status FROM support_messages 
          WHERE user_id = u.id 
          ORDER BY created_at DESC LIMIT 1
        ) AS last_status,
        SUM(CASE WHEN sm.sender_type = 'user' AND sm.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        COUNT(sm.id) AS total_messages
      FROM users u
      JOIN support_messages sm ON u.id = sm.user_id
      GROUP BY u.id
      ORDER BY pending_count DESC, last_message_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/support/conversations/:userId — get messages for user
router.get('/support/conversations/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const [userRows] = await pool.query(
      `SELECT id, name, phone, avatar_url, gender, minutes AS coins, is_online, is_verified, is_blocked, created_at
       FROM users WHERE id = ?`,
      [userId]
    );
    if (!userRows.length) return res.status(404).json({ error: 'User not found' });

    const [messages] = await pool.query(
      `SELECT id, user_id, sender_type, message, status, is_quick_faq, created_at
       FROM support_messages
       WHERE user_id = ?
       ORDER BY created_at ASC`,
      [userId]
    );

    res.json({
      user: userRows[0],
      messages,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /admin/support/reply — admin reply to a user
router.post('/support/reply', adminAuth, async (req, res) => {
  try {
    const { userId, message } = req.body;
    const trimmed = (message || '').trim();
    if (!userId || !trimmed) {
      return res.status(400).json({ error: 'User ID and message are required' });
    }

    const replyId = uuidv4();
    await pool.query(
      `INSERT INTO support_messages (id, user_id, sender_type, message, status, is_quick_faq, created_at)
       VALUES (?, ?, 'admin', ?, 'replied', 0, NOW())`,
      [replyId, userId, trimmed]
    );

    // Mark pending user messages as replied
    await pool.query(
      `UPDATE support_messages SET status = 'replied' WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );

    const [rows] = await pool.query('SELECT * FROM support_messages WHERE id = ?', [replyId]);
    const replyData = rows[0];

    // Realtime emit to user socket
    const io = req.app.get('io');
    if (io) {
      const destSocketId = io.onlineUsers?.get(userId);
      if (destSocketId) {
        io.to(destSocketId).emit('support:reply', replyData);
      }
      io.emit(`support:reply:${userId}`, replyData);
      io.emit('support:message', replyData);
    }

    res.json({ success: true, message: replyData });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /admin/support/conversations/:userId — delete conversation
router.delete('/support/conversations/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('DELETE FROM support_messages WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
