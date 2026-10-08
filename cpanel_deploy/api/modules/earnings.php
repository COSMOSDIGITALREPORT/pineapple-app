<?php
// ==============================================================================
// Pineapple App — Host Girls Earnings & Payout Ledger
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleEarningsRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    $db = Database::getConnection();

    // ── 1. GET /earnings/withdrawals ──────────────────────────────────────────
    if ($subRoute === 'withdrawals' && $method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM withdrawals WHERE girl_id = ? ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([$user['id']]);
        jsonResponse($stmt->fetchAll());
    }

    // ── 2. POST /earnings/withdraw ────────────────────────────────────────────
    if ($subRoute === 'withdraw' && $method === 'POST') {
        $amount  = (float)($body['amount'] ?? 0);
        $upiId   = trim($body['upi_id'] ?? $body['upiId'] ?? '');
        $sameDay = !empty($body['same_day'] || $body['sameDay']);

        if ($amount < 100) {
            jsonResponse(['error' => 'Minimum withdrawal amount is ₹100.'], 400);
        }
        if (!$upiId || !strpos($upiId, '@')) {
            jsonResponse(['error' => 'Enter a valid UPI ID (e.g. yourname@upi).'], 400);
        }

        // Check available balance
        $stmt = $db->prepare('SELECT COALESCE(SUM(amount_inr), 0) FROM earnings WHERE girl_id = ?');
        $stmt->execute([$user['id']]);
        $totalEarned = (float)$stmt->fetchColumn();

        $stmt = $db->prepare('SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE girl_id = ? AND status != "rejected"');
        $stmt->execute([$user['id']]);
        $totalWithdrawn = (float)$stmt->fetchColumn();

        $available = max(0.0, $totalEarned - $totalWithdrawn);
        if ($amount > $available) {
            jsonResponse(['error' => 'Insufficient available balance. You have ₹' . number_format($available, 2) . ' available.'], 400);
        }

        $fee = $sameDay ? round($amount * 0.10, 2) : 0.0;
        $id  = uniqid('wd_', true);

        $stmt = $db->prepare('INSERT INTO withdrawals (id, girl_id, amount, fee_amount, upi_id, same_day, status) VALUES (?, ?, ?, ?, ?, ?, "pending")');
        $stmt->execute([$id, $user['id'], $amount, $fee, $upiId, $sameDay ? 1 : 0]);

        // Sync user's minutes with net available coins
        $newNetAvailableCoins = max(0, round(($available - $amount) * 2));
        $db->prepare('UPDATE users SET minutes = ? WHERE id = ?')->execute([$newNetAvailableCoins, $user['id']]);

        jsonResponse([
            'success'       => true,
            'available_inr' => max(0.0, $available - $amount),
            'message'       => $sameDay
                ? "Same-day withdrawal submitted. ₹{$fee} fee applied — ₹" . number_format($amount - $fee, 2) . " will be sent today."
                : 'Withdrawal request submitted. Processing in 3-5 days.',
            'payout_id'     => $id
        ]);
    }

    // ── 3. GET /earnings or /earnings/stats ────────────────────────────────────
    if (($subRoute === '' || $subRoute === 'stats') && $method === 'GET') {
        // Total gross earned
        $stmt = $db->prepare('SELECT COALESCE(SUM(coins_received), 0) as total_coins, COALESCE(SUM(amount_inr), 0) as total_inr FROM earnings WHERE girl_id = ?');
        $stmt->execute([$user['id']]);
        $earned = $stmt->fetch();

        // Total calls summary
        $stmt = $db->prepare('
            SELECT COUNT(*) AS total_calls,
                   COALESCE(SUM(duration_seconds), 0) AS total_secs,
                   COALESCE(SUM(girl_coins), 0) AS call_coins,
                   COALESCE(SUM(girl_earnings_inr), 0) AS call_inr
            FROM calls WHERE receiver_id = ? AND status = "ended" AND (free_trial = 0 OR free_trial IS NULL)
        ');
        $stmt->execute([$user['id']]);
        $callSummary = $stmt->fetch();

        // Total withdrawn
        $stmt = $db->prepare('SELECT COALESCE(SUM(amount), 0) as total_withdrawn FROM withdrawals WHERE girl_id = ? AND status != "rejected"');
        $stmt->execute([$user['id']]);
        $withdrawn = (float)$stmt->fetchColumn();

        $totalCoins = max((float)$earned['total_coins'], (float)$callSummary['call_coins']);
        $totalInr   = max((float)$earned['total_inr'], (float)$callSummary['call_inr']);
        $totalSecs  = (int)($callSummary['total_secs'] ?? 0);
        $totalTalkMins = (int)round($totalSecs / 60) ?: ($totalSecs > 0 ? 1 : 0);
        $availInr   = max(0.0, round($totalInr - $withdrawn, 2));
        $availCoins = max(0.0, round($totalCoins - ($withdrawn * 2.0), 1));

        // Earnings ledger list
        $stmt = $db->prepare('SELECT * FROM earnings WHERE girl_id = ? ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([$user['id']]);
        $earningsList = $stmt->fetchAll();

        // Ratings summary
        $stmt = $db->prepare('SELECT COALESCE(AVG(stars), 5.0) AS avg_rating, COUNT(*) AS rating_count FROM user_ratings WHERE rated_id = ?');
        $stmt->execute([$user['id']]);
        $ratingSummary = $stmt->fetch();

        // Calls list
        $stmt = $db->prepare('
            SELECT c.*, u.name as caller_name, u.avatar_url as caller_avatar
            FROM calls c
            LEFT JOIN users u ON c.caller_id = u.id
            WHERE c.receiver_id = ?
            ORDER BY c.created_at DESC LIMIT 30
        ');
        $stmt->execute([$user['id']]);
        $calls = $stmt->fetchAll();

        // Reviews list
        $stmt = $db->prepare('
            SELECT r.*, u.name as caller_name, u.avatar_url as caller_avatar
            FROM user_ratings r
            LEFT JOIN users u ON r.rater_id = u.id
            WHERE r.rated_id = ?
            ORDER BY r.created_at DESC LIMIT 30
        ');
        $stmt->execute([$user['id']]);
        $reviews = $stmt->fetchAll();

        jsonResponse([
            'earnings' => $earningsList,
            'summary'  => [
                'total_mins'          => $totalCoins,
                'total_coins'         => $totalCoins,
                'total_inr'           => $totalInr,
                'total_talk_mins'     => $totalTalkMins,
                'total_talk_secs'     => $totalSecs,
                'total_calls'         => (int)($callSummary['total_calls'] ?? 0),
                'total_withdrawn_inr' => $withdrawn,
                'available_inr'       => $availInr,
                'available_coins'     => $availCoins,
                'avg_rating'          => number_format((float)($ratingSummary['avg_rating'] ?? 5.0), 1),
                'rating_count'        => (int)($ratingSummary['rating_count'] ?? 0),
            ],
            'calls'    => $calls,
            'reviews'  => $reviews
        ]);
    }

    jsonResponse(['error' => 'Earnings route not found: ' . $subRoute], 404);
}
