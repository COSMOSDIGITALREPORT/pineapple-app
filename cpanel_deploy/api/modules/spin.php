<?php
// ==============================================================================
// Pineapple App — Fortune Wheel Module
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleSpinRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    $db = Database::getConnection();

    // Index matches frontend PRIZES array in LuckySpinScreen.jsx exactly
    $PRIZES = [
        ['index' => 0, 'type' => 'rose',      'label' => 'Rose',      'emoji' => '🌹', 'value' => 10,    'weight' => 370],
        ['index' => 1, 'type' => 'chocolate', 'label' => 'Chocolate', 'emoji' => '🍫', 'value' => 20,    'weight' => 270],
        ['index' => 2, 'type' => 'miss',      'label' => 'Luck!',     'emoji' => '🍀', 'value' => 0,     'weight' => 100],
        ['index' => 3, 'type' => 'pastry',    'label' => 'Pastry',    'emoji' => '🍰', 'value' => 50,    'weight' => 100],
        ['index' => 4, 'type' => 'pineapple', 'label' => 'Pineapple', 'emoji' => '🍍', 'value' => 100,   'weight' => 40],
        ['index' => 5, 'type' => 'miss',      'label' => 'Luck!',     'emoji' => '🍀', 'value' => 0,     'weight' => 100],
        ['index' => 6, 'type' => 'heart',     'label' => 'Heart',     'emoji' => '❤️', 'value' => 200,   'weight' => 12],
        ['index' => 7, 'type' => 'perfume',   'label' => 'Perfume',   'emoji' => '🧴', 'value' => 500,   'weight' => 5],
        ['index' => 8, 'type' => 'crown',     'label' => 'Crown',     'emoji' => '👑', 'value' => 5000,  'weight' => 2],
        ['index' => 9, 'type' => 'diamond',   'label' => 'Diamond',   'emoji' => '💎', 'value' => 10000, 'weight' => 1],
    ];

    // ── GET /spin/status ──────────────────────────────────────────────────────
    if ($subRoute === 'status' && $method === 'GET') {
        $stmt = $db->prepare('SELECT spin_available, is_premium, coins, minutes FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch();

        if (!$row) jsonResponse(['error' => 'User not found'], 404);

        $userCoins = (float)($row['coins'] ?? $row['minutes'] ?? 0);
        $hasSpinCredit = ((int)($row['spin_available'] ?? 0)) >= 1;
        $hasCoins = $userCoins > 0;
        $isPremiumMember = !empty($row['is_premium']) || $hasSpinCredit;

        $spinAvailable = false;
        $reason = '';
        $message = '';

        if (!$isPremiumMember) {
            $reason = 'not_premium';
            $message = 'Recharge a Premium Plan to unlock Fortune Wheel!';
        } elseif (!$hasCoins) {
            $reason = 'no_coins';
            $message = 'Your membership coins are 0. Recharge a Premium Plan to unlock Fortune Wheel!';
        } elseif (!$hasSpinCredit) {
            $reason = 'plan_spin_used';
            $message = 'Fortune Wheel spin used for this plan. Recharge a Premium Plan to unlock another spin!';
        } else {
            $spinAvailable = true;
            $message = 'Fortune Wheel spin available!';
        }

        jsonResponse([
            'spinAvailable' => $spinAvailable,
            'isPremium'     => $isPremiumMember,
            'hasSpinCredit' => $hasSpinCredit,
            'coins'         => $userCoins,
            'reason'        => $reason,
            'message'       => $message
        ]);
    }

    // ── POST /spin or POST /spin/play ─────────────────────────────────────────
    if (($subRoute === '' || $subRoute === 'play') && $method === 'POST') {
        $stmt = $db->prepare('SELECT spin_available, is_premium, coins, minutes FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $curr = $stmt->fetch();

        if (!$curr) jsonResponse(['error' => 'User not found'], 404);

        $spinsLeft = (int)($curr['spin_available'] ?? 0);
        $userCoins = (float)($curr['coins'] ?? $curr['minutes'] ?? 0);

        if ($spinsLeft < 1) {
            jsonResponse(['error' => 'Recharge a Premium Plan to unlock Fortune Wheel!'], 400);
        }
        if ($userCoins <= 0) {
            jsonResponse(['error' => 'Recharge coins to spin Fortune Wheel!'], 400);
        }

        // Weighted random prize selection
        $totalWeight = array_sum(array_column($PRIZES, 'weight'));
        $rand = mt_rand(1, $totalWeight);
        $won = $PRIZES[0];
        foreach ($PRIZES as $p) {
            $rand -= $p['weight'];
            if ($rand <= 0) {
                $won = $p;
                break;
            }
        }

        $prizeCoins = (float)$won['value'];

        // Consume 1 spin credit and add prize coins (if any)
        $db->prepare('UPDATE users SET spin_available = MAX(0, COALESCE(spin_available, 0) - 1), coins = coins + ?, minutes = minutes + ? WHERE id = ?')
           ->execute([$prizeCoins, $prizeCoins, $user['id']]);

        // Insert into spin_history
        $db->prepare('INSERT INTO spin_history (id, user_id, prize, coins_won, created_at) VALUES (?, ?, ?, ?, datetime("now"))')
           ->execute([uniqid('spin_', true), $user['id'], $won['label'], $prizeCoins]);

        // If prize has coins, insert into wallet_transactions
        if ($prizeCoins > 0) {
            $note = "Won {$won['emoji']} {$won['label']} (Worth ₹{$prizeCoins}) on Fortune Wheel";
            $db->prepare('INSERT INTO wallet_transactions (id, user_id, type, amount, note, created_at) VALUES (?, ?, "spin_gift", ?, ?, datetime("now"))')
               ->execute([uniqid('tx_spin_', true), $user['id'], $prizeCoins, $note]);
        }

        $uStmt = $db->prepare('SELECT coins, minutes, spin_available FROM users WHERE id = ?');
        $uStmt->execute([$user['id']]);
        $updatedUser = $uStmt->fetch();
        $newCoins = (float)($updatedUser['coins'] ?? $updatedUser['minutes'] ?? 0);
        $remainingSpins = (int)($updatedUser['spin_available'] ?? 0);

        jsonResponse([
            'success'       => true,
            'prizeIndex'    => $won['index'],
            'prize'         => [
                'type'  => $won['type'],
                'label' => $won['label'],
                'emoji' => $won['emoji'],
                'value' => $won['value']
            ],
            'coins'         => $newCoins,
            'spinAvailable' => ($remainingSpins > 0 && $newCoins > 0)
        ]);
    }

    jsonResponse(['error' => 'Spin route not found'], 404);
}
