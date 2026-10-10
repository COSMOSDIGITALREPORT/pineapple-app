<?php
// ==============================================================================
// Pineapple App — Razorpay Payment Gateway Module (PHP + SQLite + cPanel)
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handlePaymentRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    $db = Database::getConnection();
    $config = require dirname(__DIR__) . '/config.php';

    $keyId     = $config['razorpay_key_id'] ?? '';
    $keySecret = $config['razorpay_key_secret'] ?? '';

    $packages = [
        'pack_9'   => ['coins' => 15,  'price' => 9,   'label' => 'Intro Trial', 'isIntro' => true],
        'pack_100' => ['coins' => 120, 'price' => 100, 'label' => 'Basic'],
        'pack_200' => ['coins' => 240, 'price' => 200, 'label' => 'Standard'],
        'pack_500' => ['coins' => 700, 'price' => 500, 'label' => 'Premium', 'unlocksSpin' => true],
    ];

    // ── POST /payment/create-order ────────────────────────────────────────────
    if ($subRoute === 'create-order' && $method === 'POST') {
        if (!$keyId || !$keySecret) {
            jsonResponse(['error' => 'Razorpay credentials not configured'], 500);
        }

        $packageId = trim($body['packageId'] ?? '');
        if (!isset($packages[$packageId])) {
            jsonResponse(['error' => 'Invalid package selected'], 400);
        }
        $pkg = $packages[$packageId];

        // 1-time intro pack verification
        if ($packageId === 'pack_9') {
            $uStmt = $db->prepare('SELECT intro_9_used FROM users WHERE id = ?');
            $uStmt->execute([$user['id']]);
            $uRow = $uStmt->fetch();
            if (!empty($uRow['intro_9_used'])) {
                jsonResponse(['error' => 'The ₹9 Intro Trial plan is a one-time offer for new users only.'], 400);
            }
        }

        $receipt = 'r_' . substr(str_replace('-', '', $user['id']), 0, 16) . '_' . substr((string)time(), -8);
        $orderPayload = [
            'amount'   => (int)($pkg['price'] * 100), // paise
            'currency' => 'INR',
            'receipt'  => $receipt,
            'notes'    => [
                'userId'    => $user['id'],
                'packageId' => $packageId
            ]
        ];

        $ch = curl_init('https://api.razorpay.com/v1/orders');
        curl_setopt($ch, CURLOPT_USERPWD, "{$keyId}:{$keySecret}");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderPayload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $orderData = json_decode($response, true);
        if ($httpCode !== 200 || empty($orderData['id'])) {
            jsonResponse([
                'error'  => 'Failed to create Razorpay order',
                'detail' => $orderData['error']['description'] ?? 'Razorpay API error'
            ], 500);
        }

        jsonResponse([
            'orderId'  => $orderData['id'],
            'amount'   => $orderData['amount'],
            'currency' => $orderData['currency'],
            'keyId'    => $keyId,
            'logoUrl'  => 'https://admin.pineapplemeetups.com/logo.png',
            'coins'    => $pkg['coins'],
            'price'    => $pkg['price'],
            'label'    => $pkg['label']
        ]);
    }

    // ── POST /payment/verify ──────────────────────────────────────────────────
    if ($subRoute === 'verify' && $method === 'POST') {
        if (!$keyId || !$keySecret) {
            jsonResponse(['error' => 'Razorpay credentials not configured'], 500);
        }

        $orderId   = trim($body['razorpay_order_id'] ?? '');
        $paymentId = trim($body['razorpay_payment_id'] ?? '');
        $signature = trim($body['razorpay_signature'] ?? '');
        $packageId = trim($body['packageId'] ?? '');

        if (!$orderId || !$paymentId || !$signature) {
            jsonResponse(['error' => 'Payment order ID, payment ID, and signature required'], 400);
        }

        // 1. Verify HMAC-SHA256 signature
        $expectedSig = hash_hmac('sha256', "{$orderId}|{$paymentId}", $keySecret);
        if (!hash_equals($expectedSig, $signature)) {
            jsonResponse(['error' => 'Invalid payment signature verification failed'], 400);
        }

        // 2. Prevent double crediting / replay attacks
        $dupStmt = $db->prepare('SELECT id FROM wallet_transactions WHERE ref_id = ? AND type = "purchase"');
        $dupStmt->execute([$paymentId]);
        if ($dupStmt->fetch()) {
            jsonResponse(['error' => 'Payment already verified and credited'], 409);
        }

        if (!isset($packages[$packageId])) {
            jsonResponse(['error' => 'Invalid package'], 400);
        }
        $pkg = $packages[$packageId];
        $isPremiumPack = ($packageId === 'pack_500');
        $isIntroPack   = ($packageId === 'pack_9');

        // 3. Credit coins to user
        if ($isPremiumPack) {
            $db->prepare('UPDATE users SET coins = coins + ?, minutes = minutes + ?, is_premium = 1 WHERE id = ?')
               ->execute([$pkg['coins'], $pkg['coins'], $user['id']]);
        } elseif ($isIntroPack) {
            $db->prepare('UPDATE users SET coins = coins + ?, minutes = minutes + ?, intro_9_used = 1 WHERE id = ?')
               ->execute([$pkg['coins'], $pkg['coins'], $user['id']]);
        } else {
            $db->prepare('UPDATE users SET coins = coins + ?, minutes = minutes + ? WHERE id = ?')
               ->execute([$pkg['coins'], $pkg['coins'], $user['id']]);
        }

        // 4. Log to wallet_transactions ledger
        $txnId = uniqid('tx_pay_', true);
        $note  = "Bought {$pkg['coins']} coins for ₹{$pkg['price']} ({$pkg['label']})";
        $db->prepare('INSERT INTO wallet_transactions (id, user_id, type, amount, ref_id, note, created_at) VALUES (?, ?, "purchase", ?, ?, ?, datetime("now"))')
           ->execute([$txnId, $user['id'], $pkg['coins'], $paymentId, $note]);

        // 5. Send FCM Push Notification
        try {
            Firebase::sendPushToUser($user['id'], '💳 Wallet Recharged!', "Successfully added {$pkg['coins']} coins to your wallet.", [
                'type'  => 'wallet_recharge',
                'coins' => $pkg['coins']
            ]);
        } catch (\Throwable $_) {}

        // 6. Return updated profile state
        $uStmt = $db->prepare('SELECT coins, minutes, is_premium, intro_9_used FROM users WHERE id = ?');
        $uStmt->execute([$user['id']]);
        $updatedUser = $uStmt->fetch();

        $currentCoins = (float)($updatedUser['coins'] ?? $updatedUser['minutes'] ?? 0);

        jsonResponse([
            'success'      => true,
            'coins'        => $currentCoins,
            'minsAdded'    => $pkg['coins'],
            'isPremium'    => !empty($updatedUser['is_premium']),
            'planId'       => $packageId,
            'intro_9_used' => !empty($updatedUser['intro_9_used']),
            'intro9Used'   => !empty($updatedUser['intro_9_used']),
            'spinReset'    => $isPremiumPack
        ]);
    }

    jsonResponse(['error' => 'Payment route not found'], 404);
}
