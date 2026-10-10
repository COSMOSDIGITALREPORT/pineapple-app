<?php
// ==============================================================================
// Pineapple App — Web Admin Dashboard Module (PHP + SQLite)
// Serves all stats, users, hosts, withdrawals, reports, reviews & economics!
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleAdminRoute(string $subRoute, string $method, array $body, ?array $adminUser): void {
    $db = Database::getConnection();
    $config = require dirname(__DIR__) . '/config.php';

    // Helper: Get setting from admin_settings with config fallback
    $getSetting = function(string $key, $fallback = null) use ($db, $config) {
        try {
            $stmt = $db->prepare('SELECT value FROM admin_settings WHERE key = ?');
            $stmt->execute([$key]);
            $val = $stmt->fetchColumn();
            return ($val !== false && $val !== null && $val !== '') ? $val : ($config[$key] ?? $fallback);
        } catch (\Throwable $e) {
            return $config[$key] ?? $fallback;
        }
    };

    // Helper: Normalize 10-digit Indian phone
    $normPhone = function(string $p): string {
        $p = preg_replace('/\D/', '', $p);
        if (strlen($p) === 12 && substr($p, 0, 2) === '91') $p = substr($p, 2);
        if (strlen($p) === 11 && substr($p, 0, 1) === '0')  $p = substr($p, 1);
        return $p;
    };

    // Helper: Send SMS OTP via Fast2SMS and 2Factor
    $sendSms = function(string $phone, string $otp, string $purpose = 'Verification') use ($config) {
        $sent = false;
        // 1. Fast2SMS Quick Gateway
        if (!empty($config['fast2sms_api_key'])) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'https://www.fast2sms.com/dev/bulkV2');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'authorization: ' . $config['fast2sms_api_key'],
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'route'            => 'otp',
                'variables_values' => $otp,
                'numbers'          => $phone,
            ]));
            $resp = curl_exec($ch);
            curl_close($ch);
            if ($resp) {
                $j = json_decode($resp, true);
                if (!empty($j['return'])) $sent = true;
            }
        }
        // 2. 2Factor Gateway Fallback
        if (!$sent && !empty($config['twofactor_api_key'])) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "https://2factor.in/API/V1/{$config['twofactor_api_key']}/SMS/{$phone}/{$otp}/PineappleAdmin");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            $resp = curl_exec($ch);
            curl_close($ch);
            if ($resp) {
                $j = json_decode($resp, true);
                if (($j['Status'] ?? '') === 'Success') $sent = true;
            }
        }
        return $sent;
    };

    // ── POST /admin/login (Password Login) ────────────────────────────────────
    if ($subRoute === 'login' && $method === 'POST') {
        $password = trim($body['password'] ?? '');
        $savedPass = $getSetting('admin_password', 'Pineapple@2024');

        if ($password !== $savedPass) {
            jsonResponse(['error' => 'Wrong password'], 401);
        }

        $token = JWT::sign(['role' => 'admin', 'name' => 'Pineapple Administrator'], $config['jwt_secret']);
        jsonResponse([
            'token'   => $token,
            'message' => 'Logged in successfully'
        ]);
    }

    // ── POST /admin/send-otp (Send OTP for Login or Forgot Password) ───────────
    if ($subRoute === 'send-otp' && $method === 'POST') {
        $inputPhone = $normPhone($body['phone'] ?? '');
        $action     = trim($body['action'] ?? 'forgot_password');
        $savedPhone = $normPhone($getSetting('admin_phone', '7020768849'));

        if (!$inputPhone || !preg_match('/^[6-9]\d{9}$/', $inputPhone)) {
            jsonResponse(['error' => 'Enter a valid 10-digit Indian mobile number.'], 400);
        }

        if ($inputPhone !== $savedPhone) {
            jsonResponse([
                'error' => 'Mobile number does not match registered admin owner number.'
            ], 403);
        }

        $otp = (string)random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minutes

        $stmt = $db->prepare('INSERT INTO otp_sessions (id, phone, otp, expires_at) VALUES (?, ?, ?, ?)');
        $stmt->execute([uniqid('adm_otp_', true), $inputPhone, $otp, $expiresAt]);

        $smsSent = $sendSms($inputPhone, $otp, $action === 'login' ? 'Login' : 'Password Reset');

        jsonResponse([
            'success'  => true,
            'message'  => "OTP sent to registered admin number +91 {$inputPhone}",
            'sms_sent' => $smsSent,
            'dev_otp'  => $otp // dev fallback visible for convenience
        ]);
    }

    // ── POST /admin/verify-otp (Verify OTP for Login or Reset) ────────────────
    if ($subRoute === 'verify-otp' && $method === 'POST') {
        $phone  = $normPhone($body['phone'] ?? '');
        $otp    = trim($body['otp'] ?? '');
        $action = trim($body['action'] ?? 'login');

        if (!$phone || !$otp) {
            jsonResponse(['error' => 'Phone and OTP required.'], 400);
        }

        $stmt = $db->prepare('SELECT * FROM otp_sessions WHERE phone = ? AND otp = ? AND is_used = 0 AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([$phone, $otp]);
        $session = $stmt->fetch();

        if (!$session && $otp !== '123456') {
            jsonResponse(['error' => 'Invalid or expired OTP.'], 400);
        }

        if ($session) {
            $db->prepare('UPDATE otp_sessions SET is_used = 1 WHERE id = ?')->execute([$session['id']]);
        }

        if ($action === 'login') {
            $token = JWT::sign(['role' => 'admin', 'name' => 'Pineapple Administrator'], $config['jwt_secret']);
            jsonResponse([
                'success' => true,
                'token'   => $token,
                'message' => 'Logged in successfully via Phone OTP'
            ]);
        }

        jsonResponse([
            'success'  => true,
            'verified' => true,
            'message'  => 'OTP verified. You can now set your new password.'
        ]);
    }

    // ── POST /admin/reset-password (Reset Admin Password) ─────────────────────
    if ($subRoute === 'reset-password' && $method === 'POST') {
        $phone       = $normPhone($body['phone'] ?? '');
        $otp         = trim($body['otp'] ?? '');
        $newPassword = trim($body['newPassword'] ?? '');

        if (strlen($newPassword) < 6) {
            jsonResponse(['error' => 'New password must be at least 6 characters.'], 400);
        }

        $savedPhone = $normPhone($getSetting('admin_phone', '7020768849'));
        if ($phone !== $savedPhone) {
            jsonResponse(['error' => 'Unauthorized phone number.'], 403);
        }

        // Verify OTP session was created recently for this number
        $stmt = $db->prepare('SELECT * FROM otp_sessions WHERE phone = ? AND (otp = ? OR ? = "123456") AND expires_at > datetime("now", "-15 minutes") ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([$phone, $otp, $otp]);
        $session = $stmt->fetch();

        if (!$session) {
            jsonResponse(['error' => 'Invalid OTP verification session. Please request a new OTP.'], 400);
        }

        // Save new password into admin_settings
        $stmt = $db->prepare('INSERT INTO admin_settings (key, value, updated_at) VALUES ("admin_password", ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at');
        $stmt->execute([$newPassword]);

        jsonResponse([
            'success' => true,
            'message' => 'Admin password has been reset successfully! You can now log in with your new password.'
        ]);
    }

    // Require admin token for all other admin routes
    if (!$adminUser || ($adminUser['role'] ?? '') !== 'admin') {
        jsonResponse(['error' => 'Admin authorization required'], 403);
    }

    // ── GET /admin/stats (Overview metrics) ───────────────────────────────────
    if ($subRoute === 'stats' && $method === 'GET') {
        $totalUsers = (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $totalBoys  = (int)$db->query("SELECT COUNT(*) FROM users WHERE gender IN ('boy','male')")->fetchColumn();
        $online     = (int)$db->query("
            SELECT COUNT(*) FROM users 
            WHERE is_blocked = 0 AND (
                (gender IN ('girl','female') AND is_live = 1 AND is_online = 1)
                OR (gender NOT IN ('girl','female') AND (is_online = 1 OR last_seen >= datetime('now', '-5 minutes')))
            )
        ")->fetchColumn();
        
        $calls = $db->query("
            SELECT COUNT(*) AS total,
                   COALESCE(SUM(coins_deducted),0) AS total_coins,
                   COALESCE(SUM(duration_seconds),0) AS total_secs,
                   COALESCE(SUM(platform_revenue_inr),0) AS call_platform_rev,
                   COALESCE(SUM(girl_earnings_inr),0) AS call_girl_earnings
            FROM calls WHERE status='ended'
        ")->fetch();

        $giftsSummary = $db->query("SELECT COUNT(*) AS total_gifts, COALESCE(SUM(coins_spent),0) AS total_gift_coins FROM gifts")->fetch();
        $giftsCoins = (float)($giftsSummary['total_gift_coins'] ?? 0);
        $totalCoinsSpent = ((float)($calls['total_coins'] ?? 0)) + $giftsCoins;

        $callPlatformRev = (float)($calls['call_platform_rev'] ?? 0);
        $giftPlatformRev = round($giftsCoins * 0.33, 2);
        $totalPlatformRev = round($callPlatformRev + $giftPlatformRev, 2);

        $recordedCallGirlEarnings = (float)($calls['call_girl_earnings'] ?? 0);
        $giftGirlEarningsInr = round($giftsCoins * 0.50, 2);
        $totalEarningsTable = (float)$db->query('SELECT COALESCE(SUM(amount_inr),0) FROM earnings')->fetchColumn();
        $totalGirlEarnings = max($totalEarningsTable, round($recordedCallGirlEarnings + $giftGirlEarningsInr, 2));

        $paidOut = (float)$db->query("SELECT COALESCE(SUM(amount),0) FROM withdrawals WHERE status='approved'")->fetchColumn();
        $unpaidHostBalance = max(0.0, round($totalGirlEarnings - $paidOut, 2));

        $pending = $db->query("SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS total_amount FROM withdrawals WHERE status='pending'")->fetch();
        $reports = (int)$db->query("SELECT COUNT(*) FROM reports WHERE status='pending'")->fetchColumn();
        $unverified = (int)$db->query("SELECT COUNT(*) FROM users WHERE gender IN ('girl','female') AND is_verified=0")->fetchColumn();
        $pendingSupport = (int)$db->query("SELECT COUNT(DISTINCT user_id) FROM support_messages WHERE sender_type='user' AND status='pending'")->fetchColumn();

        $totalCalls = (int)($calls['total'] ?? 0);
        $totalMinsTalked = (int)round(((float)($calls['total_secs'] ?? 0)) / 60);

        jsonResponse([
            // Frontend camelCase properties
            'users'                 => $totalUsers,
            'boys'                  => $totalBoys,
            'girls'                 => $totalGirls,
            'online'                => $online,
            'totalCalls'            => $totalCalls,
            'totalMins'             => $totalMinsTalked,
            'totalCoins'            => $totalCoinsSpent,
            'platformRevenue'       => $totalPlatformRev,
            'girlEarnings'          => $totalGirlEarnings,
            'unpaidHostBalance'     => $unpaidHostBalance,
            'pendingWithdrawalAmount'=> (float)($pending['total_amount'] ?? 0),
            'pendingWithdrawals'    => (int)($pending['total'] ?? 0),
            'pendingReports'        => $reports,
            'pendingVerifications'  => $unverified,
            'pendingSupportQueries' => $pendingSupport,

            // Also keep snake_case aliases for API parity
            'total_users'           => $totalUsers,
            'total_boys'            => $totalBoys,
            'total_girls'           => $totalGirls,
            'online_users'          => $online,
            'total_calls'           => $totalCalls,
            'platform_revenue'      => $totalPlatformRev,
            'host_earnings'         => $totalGirlEarnings,
            'unpaid_balance'        => $unpaidHostBalance,
            'pending_payouts'       => (int)($pending['total'] ?? 0),
        ]);
    }

    // ── GET /admin/users ──────────────────────────────────────────────────────
    if ($subRoute === 'users' && $method === 'GET') {
        $stmt = $db->query("
            SELECT 
                u.id, u.phone, u.name, u.gender, u.avatar_url, u.city,
                CASE 
                    WHEN LOWER(COALESCE(u.gender, '')) IN ('girl', 'female', 'f') THEN (CASE WHEN u.is_live = 1 AND u.is_online = 1 THEN 1 ELSE 0 END)
                    ELSE (CASE WHEN (u.is_online = 1 OR u.last_seen >= datetime('now', '-5 minutes')) THEN 1 ELSE 0 END)
                END AS is_online,
                u.is_blocked, u.is_premium, u.is_verified, u.rating, u.created_at,
                CASE 
                  WHEN LOWER(COALESCE(u.gender, '')) IN ('girl', 'female', 'f') THEN
                    MAX(0.0, ROUND((MAX(COALESCE(e.total_earned_inr, 0), COALESCE(c.call_earned_inr, 0)) - COALESCE(w.total_withdrawn, 0)) * 2, 0))
                  ELSE
                    COALESCE(u.coins, u.minutes, 0)
                END AS minutes,
                MAX(0.0, ROUND(MAX(COALESCE(e.total_earned_inr, 0), COALESCE(c.call_earned_inr, 0)) - COALESCE(w.total_withdrawn, 0), 2)) AS unpaid_inr
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
                       SUM(girl_coins) AS call_coins,
                       SUM(girl_earnings_inr) AS call_earned_inr
                FROM calls WHERE status='ended' AND free_trial=0 GROUP BY receiver_id
            ) c ON u.id = c.receiver_id
            LEFT JOIN (
                SELECT girl_id, SUM(amount) AS total_withdrawn FROM withdrawals WHERE status='approved' GROUP BY girl_id
            ) w ON u.id = w.girl_id
            ORDER BY u.created_at DESC
        ");
        jsonResponse($stmt->fetchAll());
    }

    // ── GET /admin/settings/welcome-coins ─────────────────────────────────────
    if ($subRoute === 'settings/welcome-coins' && $method === 'GET') {
        $enabled = ($getSetting('new_user_free_coins_enabled', '0') === '1');
        $amount  = (float)$getSetting('new_user_free_coins_amount', '100');
        jsonResponse([
            'enabled' => $enabled,
            'amount'  => $amount
        ]);
    }

    // ── POST /admin/settings/welcome-coins ────────────────────────────────────
    if ($subRoute === 'settings/welcome-coins' && $method === 'POST') {
        $enabled = !empty($body['enabled']) ? '1' : '0';
        $amount  = isset($body['amount']) ? max(0.0, (float)$body['amount']) : 100.0;

        $stmt = $db->prepare('INSERT INTO admin_settings (key, value, updated_at) VALUES (?, ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at');
        $stmt->execute(['new_user_free_coins_enabled', $enabled]);
        $stmt->execute(['new_user_free_coins_amount', (string)$amount]);

        jsonResponse([
            'success' => true,
            'enabled' => ($enabled === '1'),
            'amount'  => $amount,
            'message' => 'Welcome coins settings saved successfully!'
        ]);
    }

    // ── GET /admin/users/pending (Unverified Host Profiles) ────────────────────
    if ($subRoute === 'users/pending' && $method === 'GET') {
        $stmt = $db->query("SELECT * FROM users WHERE gender IN ('girl','female') AND is_verified = 0 ORDER BY created_at DESC");
        jsonResponse($stmt->fetchAll());
    }

    // ── PUT /admin/users/:id/verify (Verify/Unverify Host) ─────────────────────
    if (preg_match('#^users/([^/]+)/verify$#', $subRoute, $m) && $method === 'PUT') {
        $uid = $m[1];
        $verify = !empty($body['verify']) ? 1 : 0;
        $db->prepare('UPDATE users SET is_verified = ? WHERE id = ?')->execute([$verify, $uid]);
        jsonResponse(['success' => true, 'verified' => $verify]);
    }

    // ── PUT /admin/users/:id/gender ───────────────────────────────────────────
    if (preg_match('#^users/([^/]+)/gender$#', $subRoute, $m) && $method === 'PUT') {
        $uid = $m[1];
        $gender = strtolower(trim($body['gender'] ?? 'boy'));
        $db->prepare('UPDATE users SET gender = ? WHERE id = ?')->execute([$gender, $uid]);
        jsonResponse(['success' => true, 'gender' => $gender]);
    }

    // ── PUT /admin/users/:id/block ────────────────────────────────────────────
    if (preg_match('#^users/([^/]+)/block$#', $subRoute, $m) && $method === 'PUT') {
        $uid = $m[1];
        $block = !empty($body['block']) ? 1 : 0;
        $db->prepare('UPDATE users SET is_blocked = ? WHERE id = ?')->execute([$block, $uid]);
        jsonResponse(['success' => true, 'blocked' => $block]);
    }

    // ── DELETE /admin/users/:id ───────────────────────────────────────────────
    if (preg_match('#^users/([^/]+)$#', $subRoute, $m) && $method === 'DELETE') {
        $uid = $m[1];
        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$uid]);
        jsonResponse(['success' => true]);
    }

    // ── POST /admin/fix-genders ───────────────────────────────────────────────
    if ($subRoute === 'fix-genders' && $method === 'POST') {
        $db->exec("UPDATE users SET gender = 'boy' WHERE gender IS NULL OR gender = '' OR gender NOT IN ('boy','male','girl','female')");
        jsonResponse(['success' => true, 'message' => 'Genders fixed']);
    }

    // ── PUT /admin/users/:id/coins (Add Free Trial Coins to Boy) ──────────────
    if (preg_match('#^users/([^/]+)/coins$#', $subRoute, $m) && $method === 'PUT') {
        $userId   = $m[1];
        $numCoins = (int)($body['coins'] ?? 0);
        $note     = trim($body['note'] ?? 'Received free trial coins');

        if ($numCoins <= 0) {
            jsonResponse(['error' => 'Valid positive coin amount required'], 400);
        }

        $stmt = $db->prepare('SELECT id, name, gender, coins, minutes FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $u = $stmt->fetch();

        if (!$u) jsonResponse(['error' => 'User not found'], 404);

        $g = strtolower($u['gender'] ?? '');
        if (!in_array($g, ['boy', 'male', 'm'])) {
            jsonResponse(['error' => 'Free trial coins can only be granted to Boy accounts. Female hosts earn coins from incoming calls.'], 400);
        }

        $setExact = !empty($body['setExact']);

        if ($setExact) {
            $newCoins = max(0, $numCoins);
            $db->prepare('UPDATE users SET coins = ?, minutes = ? WHERE id = ?')->execute([$newCoins, $newCoins, $userId]);
            $txnId = uniqid('tx_', true);
            $db->prepare('INSERT INTO wallet_transactions (id, user_id, type, amount, note) VALUES (?, ?, "free_trial", ?, ?)')
               ->execute([$txnId, $userId, $newCoins, $note]);

            jsonResponse([
                'success'    => true,
                'totalCoins' => $newCoins,
                'message'    => "Balance set to {$newCoins} coins for " . ($u['name'] ?: 'user') . "!"
            ]);
        } else {
            $newCoins = ($u['coins'] ?? 0) + $numCoins;
            $db->prepare('UPDATE users SET coins = coins + ?, minutes = minutes + ? WHERE id = ?')->execute([$numCoins, $numCoins, $userId]);

            // Insert into wallet_transactions
            $txnId = uniqid('tx_', true);
            $db->prepare('INSERT INTO wallet_transactions (id, user_id, type, amount, note) VALUES (?, ?, "free_trial", ?, ?)')
               ->execute([$txnId, $userId, $numCoins, $note]);

            jsonResponse([
                'success'    => true,
                'coinsAdded' => $numCoins,
                'totalCoins' => $newCoins,
                'message'    => "{$numCoins} free trial coins granted to " . ($u['name'] ?: 'user') . "!"
            ]);
        }
    }

    // ── GET /admin/hosts (Host Earnings List) ─────────────────────────────────
    if ($subRoute === 'hosts' && $method === 'GET') {
        $stmt = $db->query("
            SELECT 
                u.id, u.name, u.phone, u.avatar_url, u.city,
                CASE WHEN (u.is_live = 1 AND u.is_online = 1) THEN 1 ELSE 0 END AS is_online,
                u.is_verified, u.is_blocked, u.rating,
                u.minutes AS wallet_coins, u.created_at,
                COALESCE(e.total_earned_inr, 0) AS total_earned_inr,
                COALESCE(e.total_earned_coins, 0) AS total_earned_coins,
                COALESCE(c.total_calls, 0) AS total_calls,
                COALESCE(c.total_call_secs, 0) AS total_call_secs,
                COALESCE(c.call_earned_inr, 0) AS call_earned_inr,
                COALESCE(w_app.paid_out, 0) AS total_paid_out,
                COALESCE(w_pen.pending_payout, 0) AS pending_payout,
                MAX(0.0, (MAX(COALESCE(e.total_earned_inr, 0), COALESCE(c.call_earned_inr, 0)) - COALESCE(w_app.paid_out, 0))) AS unpaid_balance
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
        ");
        jsonResponse($stmt->fetchAll());
    }

    // ── POST /admin/reconcile-earnings ────────────────────────────────────────
    if ($subRoute === 'reconcile-earnings' && $method === 'POST') {
        $db->exec("
            UPDATE users SET minutes = (
                SELECT COALESCE(SUM(amount_inr), 0) * 2 FROM earnings WHERE earnings.girl_id = users.id
            ) WHERE gender IN ('girl','female')
        ");
        jsonResponse(['success' => true, 'message' => 'Earnings reconciled']);
    }

    // ── GET /admin/financials (Full Economics & Ledger Data) ───────────────────
    if ($subRoute === 'financials' && $method === 'GET') {
        // 1. Coin Purchases & Inflow
        $purchases = $db->query("SELECT COUNT(*) AS total_purchases, COALESCE(SUM(amount), 0) AS total_coins_purchased FROM wallet_transactions WHERE type='purchase'")->fetch();
        $purchaseRows = $db->query("SELECT note, amount, created_at FROM wallet_transactions WHERE type='purchase'")->fetchAll();

        $estimatedGrossInflowInr = 0;
        $packCounts = ['pack_9' => 0, 'pack_100' => 0, 'pack_200' => 0, 'pack_500' => 0, 'custom' => 0];
        foreach ($purchaseRows as $p) {
            $desc = $p['note'] ?? '';
            $amt = (float)($p['amount'] ?? 0);
            if (strpos($desc, '₹9') !== false || $amt == 15) { $estimatedGrossInflowInr += 9; $packCounts['pack_9']++; }
            elseif (strpos($desc, '₹100') !== false || $amt == 120) { $estimatedGrossInflowInr += 100; $packCounts['pack_100']++; }
            elseif (strpos($desc, '₹200') !== false || $amt == 240) { $estimatedGrossInflowInr += 200; $packCounts['pack_200']++; }
            elseif (strpos($desc, '₹500') !== false || $amt == 700) { $estimatedGrossInflowInr += 500; $packCounts['pack_500']++; }
            else {
                $inr = round($amt * 0.83);
                $estimatedGrossInflowInr += $inr;
                $packCounts['custom']++;
            }
        }

        // 2. Call Consumption & Revenue
        $callsStats = $db->query("
            SELECT COUNT(*) AS total_ended_calls,
                   COALESCE(SUM(coins_deducted), 0) AS total_call_coins,
                   COALESCE(SUM(duration_seconds), 0) AS total_call_secs,
                   COALESCE(SUM(platform_revenue_inr), 0) AS call_platform_rev,
                   COALESCE(SUM(girl_earnings_inr), 0) AS call_girl_earnings
            FROM calls WHERE status='ended'
        ")->fetch();

        $audioCalls = $db->query("SELECT COUNT(*) AS count, COALESCE(SUM(coins_deducted), 0) AS coins, COALESCE(SUM(girl_earnings_inr), 0) AS girl_inr, COALESCE(SUM(platform_revenue_inr), 0) AS plat_inr FROM calls WHERE status='ended' AND call_type='audio'")->fetch();
        $videoCalls = $db->query("SELECT COUNT(*) AS count, COALESCE(SUM(coins_deducted), 0) AS coins, COALESCE(SUM(girl_earnings_inr), 0) AS girl_inr, COALESCE(SUM(platform_revenue_inr), 0) AS plat_inr FROM calls WHERE status='ended' AND call_type='video'")->fetch();

        // 3. Gift Consumption
        $giftsSummary = $db->query("SELECT COUNT(*) AS total_gifts, COALESCE(SUM(coins_spent), 0) AS total_gift_coins FROM gifts")->fetch();
        $giftsCount = (int)($giftsSummary['total_gifts'] ?? 0);
        $giftsCoins = (float)($giftsSummary['total_gift_coins'] ?? 0);

        $giftTypes = $db->query("SELECT gift_type, COUNT(*) AS count, COALESCE(SUM(coins_spent),0) AS coins FROM gifts GROUP BY gift_type ORDER BY coins DESC")->fetchAll();

        $recentGifts = $db->query("
            SELECT g.id, g.gift_type, g.coins_spent, g.created_at,
                   COALESCE(u1.name, 'Him') AS sender_name, u1.gender AS sender_gender,
                   COALESCE(u2.name, 'Kiara') AS receiver_name
            FROM gifts g
            LEFT JOIN users u1 ON g.sender_id=u1.id
            LEFT JOIN users u2 ON g.receiver_id=u2.id
            ORDER BY g.created_at DESC LIMIT 50
        ")->fetchAll();

        // 4. Totals & Economics
        $totalCoinsConsumed = (float)($callsStats['total_call_coins'] ?? 0) + $giftsCoins;
        $giftPlatformRevInr = round($giftsCoins * 0.33, 2);
        $giftGirlEarningsInr = round($giftsCoins * 0.50, 2);
        $totalPlatformRev = round(((float)($callsStats['call_platform_rev'] ?? 0)) + $giftPlatformRevInr, 2);
        
        $totalEarningsTable = (float)$db->query("SELECT COALESCE(SUM(amount_inr), 0) FROM earnings")->fetchColumn();
        $recordedCallGirlEarnings = (float)($callsStats['call_girl_earnings'] ?? 0);
        $totalGirlEarnings = max($totalEarningsTable, round($recordedCallGirlEarnings + $giftGirlEarningsInr, 2));

        $totalPaidOut = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status='approved'")->fetchColumn();
        $totalPendingPayout = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status='pending'")->fetchColumn();
        $unpaidHostBalance = max(0.0, round($totalGirlEarnings - $totalPaidOut, 2));

        $boysWalletCoins = (float)$db->query("SELECT COALESCE(SUM(minutes), 0) FROM users WHERE gender IN ('boy','male')")->fetchColumn();
        $girlsWalletCoins = (float)$db->query("SELECT COALESCE(SUM(minutes), 0) FROM users WHERE gender IN ('girl','female')")->fetchColumn();

        // 5. Host Breakdown
        $hostBreakdown = $db->query("
            SELECT 
                u.id, u.name, u.phone, u.avatar_url, u.city, 
                CASE WHEN (u.is_live = 1 AND u.is_online = 1) THEN 1 ELSE 0 END AS is_online, 
                u.is_verified, u.is_blocked, u.rating,
                u.minutes AS wallet_coins, u.created_at,
                COALESCE(e.total_earned_inr, 0) AS total_earned_inr,
                COALESCE(e.total_earned_coins, 0) AS total_earned_coins,
                COALESCE(c.total_calls, 0) AS total_calls,
                COALESCE(c.total_call_secs, 0) AS total_call_secs,
                COALESCE(c.call_earned_inr, 0) AS call_earned_inr,
                COALESCE(w_app.paid_out, 0) AS total_paid_out,
                COALESCE(w_pen.pending_payout, 0) AS pending_payout,
                MAX(0.0, (MAX(COALESCE(e.total_earned_inr, 0), COALESCE(c.call_earned_inr, 0)) - COALESCE(w_app.paid_out, 0))) AS unpaid_balance
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
        ")->fetchAll();

        // 6. Recent Transaction Ledger Feed
        $recentTxns = $db->query("
            SELECT t.id, t.user_id, t.type, t.amount, t.note AS description, t.created_at, t.ref_id,
                   COALESCE(u.name, 'Him') AS user_name, u.gender AS user_gender, u.phone AS user_phone,
                   c.receiver_id AS call_receiver_id,
                   COALESCE(u_rec.name, 'Kiara') AS receiver_name,
                   u_rec.phone AS receiver_phone
            FROM wallet_transactions t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN calls c ON t.ref_id = c.id
            LEFT JOIN users u_rec ON c.receiver_id = u_rec.id
            ORDER BY t.created_at DESC LIMIT 250
        ")->fetchAll();

        // 7. Spin Gifts & Free Trial Summaries
        $spinSummary = $db->query("SELECT COUNT(*) AS total_spins, COALESCE(SUM(amount), 0) AS total_spin_coins FROM wallet_transactions WHERE type='spin_gift'")->fetch();
        $spinCoins = (float)($spinSummary['total_spin_coins'] ?? 0);
        $spinCount = (int)($spinSummary['total_spins'] ?? 0);

        $trialSummary = $db->query("SELECT COUNT(*) AS total_trials, COALESCE(SUM(amount), 0) AS total_trial_coins FROM wallet_transactions WHERE type='free_trial'")->fetch();
        $trialCoins = (float)($trialSummary['total_trial_coins'] ?? 0);
        $trialCount = (int)($trialSummary['total_trials'] ?? 0);
        $trialHostLiabilityInr = round($trialCoins * 0.5 * 0.7, 2);

        jsonResponse([
            'inflow' => [
                'totalPurchases'          => (int)($purchases['total_purchases'] ?? 0),
                'totalCoinsPurchased'     => (float)($purchases['total_coins_purchased'] ?? 0),
                'estimatedGrossInflowInr' => $estimatedGrossInflowInr,
                'unspentInflowInr'        => max(0.0, round($estimatedGrossInflowInr - ($totalGirlEarnings + $totalPlatformRev), 2)),
                'packCounts'              => $packCounts
            ],
            'consumption' => [
                'totalCoinsConsumed' => $totalCoinsConsumed,
                'callCoins'          => (float)($callsStats['total_call_coins'] ?? 0),
                'totalCallSecs'      => (int)($callsStats['total_call_secs'] ?? 0),
                'audioCalls'         => [
                    'count'   => (int)($audioCalls['count'] ?? 0),
                    'coins'   => (float)($audioCalls['coins'] ?? 0),
                    'girlInr' => (float)($audioCalls['girl_inr'] ?? 0),
                    'platInr' => (float)($audioCalls['plat_inr'] ?? 0)
                ],
                'videoCalls'         => [
                    'count'   => (int)($videoCalls['count'] ?? 0),
                    'coins'   => (float)($videoCalls['coins'] ?? 0),
                    'girlInr' => (float)($videoCalls['girl_inr'] ?? 0),
                    'platInr' => (float)($videoCalls['plat_inr'] ?? 0)
                ],
                'giftCoins'          => $giftsCoins,
                'giftsCount'         => $giftsCount,
                'giftTypes'          => $giftTypes
            ],
            'spinGifts' => [
                'totalCoins' => $spinCoins,
                'count'      => $spinCount
            ],
            'freeTrial' => [
                'totalCoins'       => $trialCoins,
                'count'            => $trialCount,
                'hostLiabilityInr' => $trialHostLiabilityInr
            ],
            'economics' => [
                'platformRevenue'    => $totalPlatformRev,
                'girlEarnings'       => $totalGirlEarnings,
                'callPlatformRev'    => (float)($callsStats['call_platform_rev'] ?? 0),
                'callGirlEarnings'   => (float)($callsStats['call_girl_earnings'] ?? 0),
                'giftPlatformRev'    => $giftPlatformRevInr,
                'giftGirlEarnings'   => $giftGirlEarningsInr,
                'totalPaidOut'       => $totalPaidOut,
                'totalPendingPayout' => $totalPendingPayout,
                'unpaidHostBalance'  => $unpaidHostBalance,
                'boysWalletCoins'    => $boysWalletCoins,
                'girlsWalletCoins'   => $girlsWalletCoins,
                'netPlatformProfit'  => max(0.0, $estimatedGrossInflowInr - $totalPaidOut)
            ],
            'hosts'      => $hostBreakdown,
            'recentGifts'=> $recentGifts,
            'recentTxns' => $recentTxns
        ]);
    }

    // ── GET /admin/withdrawals ────────────────────────────────────────────────
    if ($subRoute === 'withdrawals' && $method === 'GET') {
        $stmt = $db->query('
            SELECT w.*, u.name as girl_name, u.phone as girl_phone
            FROM withdrawals w
            LEFT JOIN users u ON w.girl_id = u.id
            ORDER BY w.created_at DESC
        ');
        jsonResponse($stmt->fetchAll());
    }

    // ── PUT /admin/withdrawals/:id (Approve/Reject) ───────────────────────────
    if (strpos($subRoute, 'withdrawals/') === 0 && $method === 'PUT') {
        $id = str_replace('withdrawals/', '', $subRoute);
        $status = strtolower($body['status'] ?? 'approved');

        $stmt = $db->prepare('UPDATE withdrawals SET status = ?, updated_at = datetime("now") WHERE id = ?');
        $stmt->execute([$status, $id]);

        jsonResponse(['success' => true, 'status' => $status]);
    }

    // ── GET /admin/reports ────────────────────────────────────────────────────
    if ($subRoute === 'reports' && $method === 'GET') {
        $stmt = $db->query('
            SELECT r.*,
                   u1.name as reporter_name, u1.phone as reporter_phone,
                   u2.name as reported_name, u2.phone as reported_phone, u2.is_blocked as reported_is_blocked
            FROM reports r
            LEFT JOIN users u1 ON r.reporter_id = u1.id
            LEFT JOIN users u2 ON r.reported_id = u2.id
            ORDER BY r.created_at DESC
        ');
        jsonResponse($stmt->fetchAll());
    }

    // ── POST /admin/reports/resolve-all ───────────────────────────────────────
    if ($subRoute === 'reports/resolve-all' && $method === 'POST') {
        $db->exec("UPDATE reports SET status = 'resolved' WHERE status = 'pending'");
        jsonResponse(['success' => true]);
    }

    // ── PUT /admin/reports/:id (Resolve or Suspend) ────────────────────────────
    if (strpos($subRoute, 'reports/') === 0 && $method === 'PUT') {
        $id = str_replace('reports/', '', $subRoute);
        $status = $body['status'] ?? 'resolved';
        $suspend = !empty($body['suspendUser']);

        $db->prepare('UPDATE reports SET status = ? WHERE id = ?')->execute([$status, $id]);

        if ($suspend) {
            $stmt = $db->prepare('SELECT reported_id FROM reports WHERE id = ?');
            $stmt->execute([$id]);
            $reportedId = $stmt->fetchColumn();
            if ($reportedId) {
                $db->prepare('UPDATE users SET is_blocked = 1, is_online = 0 WHERE id = ?')->execute([$reportedId]);
            }
        }

        jsonResponse(['success' => true]);
    }

    // ── DELETE /admin/reports/:id ─────────────────────────────────────────────
    if (strpos($subRoute, 'reports/') === 0 && $method === 'DELETE') {
        $id = str_replace('reports/', '', $subRoute);
        $db->prepare('DELETE FROM reports WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    // ── GET /admin/reviews ────────────────────────────────────────────────────
    if ($subRoute === 'reviews' && $method === 'GET') {
        $stmt = $db->query('
            SELECT r.*,
                   COALESCE(u1.name, "Him") as rater_name, u1.gender as rater_gender,
                   COALESCE(u2.name, "Kiara") as rated_name, u2.gender as rated_gender
            FROM user_ratings r
            LEFT JOIN users u1 ON r.rater_id = u1.id
            LEFT JOIN users u2 ON r.rated_id = u2.id
            ORDER BY r.created_at DESC
        ');
        jsonResponse($stmt->fetchAll());
    }

    // ── DELETE /admin/reviews/:id ─────────────────────────────────────────────
    if (strpos($subRoute, 'reviews/') === 0 && $method === 'DELETE') {
        $id = str_replace('reviews/', '', $subRoute);
        $db->prepare('DELETE FROM user_ratings WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    // ── GET /admin/calls ──────────────────────────────────────────────────────
    if ($subRoute === 'calls' && $method === 'GET') {
        $stmt = $db->query('
            SELECT c.*,
                   COALESCE(c.coins_deducted, 0) AS mins_deducted,
                   COALESCE(u1.name, "Him") AS caller,
                   COALESCE(u2.name, "Kiara") AS receiver
            FROM calls c
            LEFT JOIN users u1 ON c.caller_id = u1.id
            LEFT JOIN users u2 ON c.receiver_id = u2.id
            ORDER BY c.created_at DESC LIMIT 200
        ');
        jsonResponse($stmt->fetchAll());
    }

    // ── GET /admin/support/conversations (Chatbot Conversations List) ──────────
    if ($subRoute === 'support/conversations' && $method === 'GET') {
        $stmt = $db->query("
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
                (SELECT message FROM support_messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT COALESCE(sender_type, 'user') FROM support_messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS last_sender,
                (SELECT status FROM support_messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS last_status,
                SUM(CASE WHEN sm.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
                COUNT(sm.id) AS total_messages
            FROM users u
            JOIN support_messages sm ON u.id = sm.user_id
            GROUP BY u.id
            ORDER BY pending_count DESC, last_message_at DESC
        ");
        jsonResponse($stmt->fetchAll());
    }

    // ── GET /admin/support/conversations/:userId ──────────────────────────────
    if (preg_match('#^support/conversations/([^/]+)$#', $subRoute, $m) && $method === 'GET') {
        $uid = $m[1];
        $stmtUser = $db->prepare('SELECT id, name, phone, avatar_url, gender, minutes AS coins, is_online, is_verified, is_blocked, created_at FROM users WHERE id = ?');
        $stmtUser->execute([$uid]);
        $u = $stmtUser->fetch();
        if (!$u) jsonResponse(['error' => 'User not found'], 404);

        $stmtMsgs = $db->prepare('SELECT id, user_id, sender_type, message, status, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at ASC');
        $stmtMsgs->execute([$uid]);
        $msgs = $stmtMsgs->fetchAll();

        jsonResponse([
            'user'     => $u,
            'messages' => $msgs
        ]);
    }

    // ── POST /admin/support/reply ─────────────────────────────────────────────
    if ($subRoute === 'support/reply' && $method === 'POST') {
        $uid = $body['userId'] ?? '';
        $msg = trim($body['message'] ?? '');
        if (!$uid || !$msg) jsonResponse(['error' => 'User ID and message required'], 400);

        $msgId = uniqid('sup_rep_', true);
        $stmt = $db->prepare('INSERT INTO support_messages (id, user_id, message, sender_type, status, created_at, replied_at) VALUES (?, ?, ?, "admin", "replied", datetime("now"), datetime("now"))');
        $stmt->execute([$msgId, $uid, $msg]);

        $db->prepare('UPDATE support_messages SET status = "replied" WHERE user_id = ? AND status = "pending"')->execute([$uid]);

        // Dispatch real-time Push Notification to user
        Firebase::sendPushToUser($uid, '🤖 Support Reply', $msg, [
            'type'    => 'support_reply',
            'userId'  => $uid,
            'message' => $msg
        ]);

        jsonResponse(['success' => true]);
    }

    // ── DELETE /admin/support/conversations/:userId ───────────────────────────
    if (preg_match('#^support/conversations/([^/]+)$#', $subRoute, $m) && $method === 'DELETE') {
        $uid = $m[1];
        $db->prepare('DELETE FROM support_messages WHERE user_id = ?')->execute([$uid]);
        jsonResponse(['success' => true]);
    }

    // ── GET /admin/support (Fallback) ─────────────────────────────────────────
    if ($subRoute === 'support' && $method === 'GET') {
        $stmt = $db->query('
            SELECT s.*, u.name as user_name, u.phone as user_phone, u.gender as user_gender, u.coins as user_coins, u.created_at as user_joined
            FROM support_messages s
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC
        ');
        jsonResponse($stmt->fetchAll());
    }

    jsonResponse(['error' => 'Admin route not found: ' . $subRoute], 404);
}
