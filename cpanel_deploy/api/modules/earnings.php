<?php
// ==============================================================================
// Pineapple App — Host Girls Earnings & Payout Ledger
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleEarningsRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    $db = Database::getConnection();

    // ── GET /earnings ─────────────────────────────────────────────────────────
    if ($subRoute === '' && $method === 'GET') {
        // Total gross earned
        $stmt = $db->prepare('SELECT COALESCE(SUM(coins_received), 0) as total_coins, COALESCE(SUM(amount_inr), 0) as total_inr FROM earnings WHERE girl_id = ?');
        $stmt->execute([$user['id']]);
        $earned = $stmt->fetch();

        // Total withdrawn
        $stmt = $db->prepare('SELECT COALESCE(SUM(amount), 0) as total_withdrawn FROM withdrawals WHERE girl_id = ? AND status != "rejected"');
        $stmt->execute([$user['id']]);
        $withdrawn = (float)$stmt->fetchColumn();

        $totalInr   = (float)$earned['total_inr'];
        $totalCoins = (float)$earned['total_coins'];
        $availInr   = max(0.0, round($totalInr - $withdrawn, 2));
        $availCoins = max(0.0, round($totalCoins - ($withdrawn * 2.0), 1));

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
            'summary' => [
                'total_coins'         => $totalCoins,
                'total_inr'           => $totalInr,
                'available_inr'       => $availInr,
                'available_coins'     => $availCoins,
                'total_withdrawn_inr' => $withdrawn
            ],
            'calls'   => $calls,
            'reviews' => $reviews
        ]);
    }

    jsonResponse(['error' => 'Earnings route not found'], 404);
}
