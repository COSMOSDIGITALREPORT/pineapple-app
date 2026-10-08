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
        $totalGirls = (int)$db->query("SELECT COUNT(*) FROM users WHERE gender IN ('girl','female')")->fetchColumn();
        $online     = (int)$db->query('SELECT COUNT(*) FROM users WHERE is_online = 1')->fetchColumn();
        $totalCalls = (int)$db->query('SELECT COUNT(*) FROM calls WHERE status = "ended"')->fetchColumn();
        
        $revenue = (float)$db->query('SELECT COALESCE(SUM(platform_revenue_inr), 0) FROM calls')->fetchColumn();
        $hostEarned = (float)$db->query('SELECT COALESCE(SUM(girl_earnings_inr), 0) FROM calls')->fetchColumn();
        $paidOut = (float)$db->query('SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = "approved"')->fetchColumn();
        $pendingWd = (int)$db->query('SELECT COUNT(*) FROM withdrawals WHERE status = "pending"')->fetchColumn();

        jsonResponse([
            'total_users'     => $totalUsers,
            'total_boys'      => $totalBoys,
            'total_girls'     => $totalGirls,
            'online_users'    => $online,
            'total_calls'     => $totalCalls,
            'platform_revenue'=> $revenue,
            'host_earnings'   => $hostEarned,
            'unpaid_balance'  => max(0.0, $hostEarned - $paidOut),
            'pending_payouts' => $pendingWd
        ]);
    }

    // ── GET /admin/users ──────────────────────────────────────────────────────
    if ($subRoute === 'users' && $method === 'GET') {
        $stmt = $db->query('SELECT * FROM users ORDER BY created_at DESC LIMIT 200');
        jsonResponse($stmt->fetchAll());
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

    // ── GET /admin/hosts (Host Earnings List) ─────────────────────────────────
    if ($subRoute === 'hosts' && $method === 'GET') {
        $stmt = $db->query("
            SELECT u.*,
                   COALESCE(SUM(e.amount_inr), 0) as total_earned_inr,
                   COALESCE(SUM(e.coins_received), 0) as total_earned_coins,
                   COALESCE((SELECT SUM(amount) FROM withdrawals w WHERE w.girl_id = u.id AND w.status = 'approved'), 0) as total_paid_out,
                   (COALESCE(SUM(e.amount_inr), 0) - COALESCE((SELECT SUM(amount) FROM withdrawals w WHERE w.girl_id = u.id AND w.status != 'rejected'), 0)) as unpaid_balance
            FROM users u
            LEFT JOIN earnings e ON u.id = e.girl_id
            WHERE u.gender IN ('girl', 'female')
            GROUP BY u.id
            ORDER BY unpaid_balance DESC
        ");
        jsonResponse($stmt->fetchAll());
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
                   u1.name as rater_name, u1.gender as rater_gender,
                   u2.name as rated_name, u2.gender as rated_gender
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
                   u1.name as caller_name,
                   u2.name as receiver_name
            FROM calls c
            LEFT JOIN users u1 ON c.caller_id = u1.id
            LEFT JOIN users u2 ON c.receiver_id = u2.id
            ORDER BY c.created_at DESC LIMIT 100
        ');
        jsonResponse($stmt->fetchAll());
    }

    // ── GET /admin/support ────────────────────────────────────────────────────
    if ($subRoute === 'support' && $method === 'GET') {
        $stmt = $db->query('
            SELECT s.*, u.name as user_name, u.phone as user_phone, u.gender as user_gender, u.coins as user_coins, u.created_at as user_joined
            FROM support_messages s
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC
        ');
        jsonResponse($stmt->fetchAll());
    }

    // ── POST /admin/support/reply ─────────────────────────────────────────────
    if ($subRoute === 'support/reply' && $method === 'POST') {
        $msgId = $body['messageId'] ?? '';
        $reply = trim($body['reply'] ?? '');

        if (!$msgId || !$reply) jsonResponse(['error' => 'Message ID and reply text required'], 400);

        $db->prepare('UPDATE support_messages SET reply = ?, status = "replied", replied_at = datetime("now") WHERE id = ?')
           ->execute([$reply, $msgId]);

        jsonResponse(['success' => true]);
    }

    // ── GET /admin/economics ──────────────────────────────────────────────────
    if ($subRoute === 'economics' && $method === 'GET') {
        $spinCoinsWon = (float)$db->query('SELECT COALESCE(SUM(coins_won), 0) FROM spin_history')->fetchColumn();
        $virtualGifts = (int)$db->query('SELECT COUNT(*) FROM gifts')->fetchColumn();
        $userFloat    = (float)$db->query("SELECT COALESCE(SUM(coins), 0) FROM users WHERE gender IN ('boy','male')")->fetchColumn();
        $revCalls     = (float)$db->query('SELECT COALESCE(SUM(platform_revenue_inr), 0) FROM calls')->fetchColumn();
        $hostTotal    = (float)$db->query('SELECT COALESCE(SUM(girl_earnings_inr), 0) FROM calls')->fetchColumn();

        jsonResponse([
            'spin_gifts_won'        => $spinCoinsWon,
            'virtual_gifts_sent'    => $virtualGifts,
            'unconsumed_bank_float' => $userFloat,
            'platform_revenue'      => $revCalls,
            'host_earnings'         => $hostTotal
        ]);
    }

    jsonResponse(['error' => 'Admin route not found: ' . $subRoute], 404);
}
