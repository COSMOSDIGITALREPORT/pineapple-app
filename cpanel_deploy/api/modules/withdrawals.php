<?php
// ==============================================================================
// Pineapple App — Host Withdrawals (Cashout via UPI)
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleWithdrawalsRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    $db = Database::getConnection();

    // ── GET /withdrawals (Host Withdrawal History) ───────────────────────────
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM withdrawals WHERE girl_id = ? ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([$user['id']]);
        jsonResponse($stmt->fetchAll());
    }

    // ── POST /withdrawals (Request Cashout) ──────────────────────────────────
    if ($method === 'POST') {
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

        $fee = $sameDay ? round($amount * 0.05, 2) : 0.0;
        $id  = uniqid('wd_', true);

        $stmt = $db->prepare('INSERT INTO withdrawals (id, girl_id, amount, fee_amount, upi_id, same_day, status) VALUES (?, ?, ?, ?, ?, ?, "pending")');
        $stmt->execute([$id, $user['id'], $amount, $fee, $upiId, $sameDay ? 1 : 0]);

        jsonResponse([
            'success'   => true,
            'message'   => 'Withdrawal request submitted! It will be reviewed by admin within 24 hours.',
            'payout_id' => $id
        ]);
    }

    jsonResponse(['error' => 'Withdrawals route not found'], 404);
}
