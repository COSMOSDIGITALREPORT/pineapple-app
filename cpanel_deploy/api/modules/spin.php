<?php
// ==============================================================================
// Pineapple App — Fortune Wheel Module
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleSpinRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    $db = Database::getConnection();

    // ── POST /spin/play ───────────────────────────────────────────────────────
    if ($method === 'POST') {
        // Check if user has unlocked spin (is_premium == 1)
        if (empty($user['is_premium'])) {
            jsonResponse(['error' => 'Recharge any premium plan to unlock the Fortune Wheel!'], 403);
        }

        // Possible Prizes
        $prizes = [
            ['label' => '50 Coins',   'coins' => 50],
            ['label' => '100 Coins',  'coins' => 100],
            ['label' => '200 Coins',  'coins' => 200],
            ['label' => '500 Coins',  'coins' => 500],
            ['label' => 'Free Audio Call', 'coins' => 30],
            ['label' => '1000 Coins Jackpot', 'coins' => 1000]
        ];

        $won = $prizes[array_rand($prizes)];

        // Log spin
        $db->prepare('INSERT INTO spin_history (id, user_id, prize, coins_won) VALUES (?, ?, ?, ?)')
           ->execute([uniqid('spin_', true), $user['id'], $won['label'], $won['coins']]);

        // Credit coins
        $db->prepare('UPDATE users SET coins = coins + ?, minutes = minutes + ? WHERE id = ?')
           ->execute([$won['coins'], $won['coins'], $user['id']]);

        // Log transaction
        $db->prepare('INSERT INTO wallet_transactions (id, user_id, type, amount, note) VALUES (?, ?, "spin", ?, ?)')
           ->execute([uniqid('tx_', true), $user['id'], $won['coins'], 'Fortune Wheel Prize: ' . $won['label']]);

        jsonResponse([
            'success'   => true,
            'prize'     => $won['label'],
            'coins_won' => $won['coins']
        ]);
    }

    jsonResponse(['error' => 'Spin route not found'], 404);
}
