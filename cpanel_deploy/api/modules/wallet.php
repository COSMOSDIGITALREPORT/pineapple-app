<?php
// ==============================================================================
// Pineapple App — Wallet & Gifts Module (PHP + SQLite)
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleWalletRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    $db = Database::getConnection();

    // ── GET /wallet (Balance & Transactions) ──────────────────────────────────
    if (($subRoute === '' || $subRoute === 'summary') && $method === 'GET') {
        $stmt = $db->prepare('SELECT coins, minutes FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $u = $stmt->fetch();

        // Recent ledger transactions
        $stmt = $db->prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30');
        $stmt->execute([$user['id']]);
        $txns = $stmt->fetchAll();

        // Recent gifts received
        $stmt = $db->prepare('SELECT g.*, u.name as sender_name FROM gifts g LEFT JOIN users u ON g.sender_id = u.id WHERE g.receiver_id = ? ORDER BY g.created_at DESC LIMIT 30');
        $stmt->execute([$user['id']]);
        $gifts = $stmt->fetchAll();

        jsonResponse([
            'coins'        => (float)($u['coins'] ?? $u['minutes'] ?? 0),
            'minutes'      => (float)($u['minutes'] ?? 0),
            'transactions' => $txns,
            'gifts'        => $gifts
        ]);
    }

    // ── GET /wallet/transactions (Transaction Ledger for App) ─────────────────
    if ($subRoute === 'transactions' && $method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([$user['id']]);
        $txns = $stmt->fetchAll();
        jsonResponse($txns);
    }

    // ── POST /wallet/send-gift ────────────────────────────────────────────────
    if ($subRoute === 'send-gift' && $method === 'POST') {
        $receiverId = trim($body['receiverId'] ?? '');
        $giftType   = trim($body['giftType'] ?? 'Rose');
        $costCoins  = (float)($body['coins'] ?? $body['cost'] ?? 10);

        if (!$receiverId) jsonResponse(['error' => 'Receiver required'], 400);

        $callerCoins = (float)($user['coins'] ?? $user['minutes'] ?? 0);
        if ($callerCoins < $costCoins) {
            jsonResponse(['error' => 'Insufficient coins to send this gift.'], 402);
        }

        // Deduct from sender
        $db->prepare('UPDATE users SET coins = MAX(0, coins - ?), minutes = MAX(0, minutes - ?) WHERE id = ?')
           ->execute([$costCoins, $costCoins, $user['id']]);

        // Credit to host (70% value, 0.50 INR per coin)
        $girlCoins = round($costCoins * 0.70, 2);
        $girlInr   = round($girlCoins * 0.50, 2);
        $db->prepare('UPDATE users SET coins = coins + ?, minutes = minutes + ? WHERE id = ?')
           ->execute([$girlCoins, $girlCoins, $receiverId]);

        // Insert gift log
        $giftId = uniqid('gift_', true);
        $db->prepare('INSERT INTO gifts (id, sender_id, receiver_id, gift_type, coins_spent) VALUES (?, ?, ?, ?, ?)')
           ->execute([$giftId, $user['id'], $receiverId, $giftType, $costCoins]);

        // Insert transaction & earnings
        $db->prepare('INSERT INTO wallet_transactions (id, user_id, type, amount, ref_id, note) VALUES (?, ?, "gift", ?, ?, ?)')
           ->execute([uniqid('tx_', true), $user['id'], -$costCoins, $giftId, "Sent $giftType"]);

        $db->prepare('INSERT INTO earnings (id, girl_id, call_id, coins_received, amount_inr) VALUES (?, ?, ?, ?, ?)')
           ->execute([uniqid('e_', true), $receiverId, $giftId, $girlCoins, $girlInr]);

        // Push real-time gift event to receiver via Firebase
        Firebase::sendSignal($receiverId, 'gift:received', [
            'giftType'   => $giftType,
            'senderName' => $user['name'] ?: 'User',
            'coins'      => $girlCoins,
            'inr'        => $girlInr
        ]);

        jsonResponse([
            'success'   => true,
            'remaining' => $callerCoins - $costCoins,
            'giftType'  => $giftType
        ]);
    }

    jsonResponse(['error' => 'Wallet route not found'], 404);
}
