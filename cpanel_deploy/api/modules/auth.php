<?php
// ==============================================================================
// Pineapple App — Auth Module (PHP + SQLite)
// Implements strict cross-gender login checks & JWT token generation!
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function checkGenderMatch(?string $existingGender, ?string $requestedGender): ?string {
    if (!$existingGender || !$requestedGender) return null;
    $eg = strtolower($existingGender);
    $rg = strtolower($requestedGender);

    $isGirl    = in_array($eg, ['girl', 'female', 'f']);
    $isBoy     = in_array($eg, ['boy', 'male', 'm']);
    $isReqGirl = in_array($rg, ['girl', 'female', 'f']);
    $isReqBoy  = in_array($rg, ['boy', 'male', 'm']);

    if ($isGirl && $isReqBoy) {
        return 'This mobile number is registered as a Female Host on Pineapple Girls. Please use the Pineapple Girls app to login.';
    }
    if ($isBoy && $isReqGirl) {
        return 'This mobile number is registered as a Male User on Pineapple Boys. Please use the Pineapple Boys app to login.';
    }
    return null;
}

function handleAuthRoute(string $subRoute, string $method, array $body, ?array $user): void {
    $db = Database::getConnection();
    $config = require dirname(__DIR__) . '/config.php';

    // ── POST /auth/send-otp ────────────────────────────────────────────────────
    if ($subRoute === 'send-otp' && $method === 'POST') {
        $phone  = trim($body['phone'] ?? '');
        $gender = trim($body['appType'] ?? $body['gender'] ?? '');

        if (!preg_match('/^[6-9]\d{9}$/', $phone)) {
            jsonResponse(['error' => 'Enter a valid 10-digit Indian mobile number.'], 400);
        }

        // 1. Cross-Gender & Block Check
        if ($gender) {
            $stmt = $db->prepare('SELECT gender, is_blocked FROM users WHERE phone = ?');
            $stmt->execute([$phone]);
            $existing = $stmt->fetch();

            if ($existing) {
                if (!empty($existing['is_blocked'])) {
                    jsonResponse(['error' => 'Your account has been suspended.'], 403);
                }
                $mismatch = checkGenderMatch($existing['gender'], $gender);
                if ($mismatch) {
                    jsonResponse(['error' => $mismatch], 400);
                }
            }
        }

        // 2. Generate OTP
        $otp = (string)rand(1000, 9999);
        $expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minutes

        $stmt = $db->prepare('INSERT INTO otp_sessions (id, phone, otp, expires_at) VALUES (?, ?, ?, ?)');
        $stmt->execute([uniqid('otp_', true), $phone, $otp, $expiresAt]);

        // 3. Dispatch Voice Call OTP via 2Factor
        if (!empty($config['twofactor_api_key'])) {
            $apiKey = urlencode($config['twofactor_api_key']);
            $vUrl = "https://2factor.in/API/V1/{$apiKey}/VOICE/{$phone}/{$otp}";
            $ctx = stream_context_create(['http' => ['timeout' => 5]]);
            @file_get_contents($vUrl, false, $ctx);
        }

        jsonResponse([
            'success' => true,
            'dev_otp' => $otp,
            'message' => 'OTP sent successfully'
        ]);
    }

    // ── POST /auth/verify-otp ──────────────────────────────────────────────────
    if ($subRoute === 'verify-otp' && $method === 'POST') {
        $phone     = trim($body['phone'] ?? '');
        $otp       = trim($body['otp'] ?? '');
        $gender    = trim($body['appType'] ?? $body['gender'] ?? 'boy');
        $dob       = trim($body['dob'] ?? '');

        if (!$phone || !$otp) {
            jsonResponse(['error' => 'Phone and OTP required.'], 400);
        }

        // 1. Validate OTP Session
        $stmt = $db->prepare('SELECT * FROM otp_sessions WHERE phone = ? AND otp = ? AND is_used = 0 AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([$phone, $otp]);
        $session = $stmt->fetch();

        // Allow dev OTP '1234' or matched session
        if (!$session && $otp !== '1234') {
            jsonResponse(['error' => 'Invalid or expired OTP.'], 400);
        }
        if ($session) {
            $db->prepare('UPDATE otp_sessions SET is_used = 1 WHERE id = ?')->execute([$session['id']]);
        }

        // 2. Check or create User
        $stmt = $db->prepare('SELECT * FROM users WHERE phone = ?');
        $stmt->execute([$phone]);
        $userData = $stmt->fetch();

        if ($userData) {
            if (!empty($userData['is_blocked'])) {
                jsonResponse(['error' => 'Your account has been suspended.'], 403);
            }
            $mismatch = checkGenderMatch($userData['gender'], $gender);
            if ($mismatch) {
                jsonResponse(['error' => $mismatch], 400);
            }
            $db->prepare('UPDATE users SET last_seen = datetime("now"), is_online = 1 WHERE phone = ?')->execute([$phone]);
            $stmt->execute([$phone]);
            $userData = $stmt->fetch();
        } else {
            $userId = uniqid('u_', true);
            $initialCoins = ($gender === 'girl') ? 0.0 : 500.0;
            $insert = $db->prepare('INSERT INTO users (id, phone, gender, dob, coins, minutes, is_online, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1, 1)');
            $insert->execute([$userId, $phone, $gender, $dob ?: null, $initialCoins, $initialCoins]);
            
            $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $userData = $stmt->fetch();
        }

        $token = JWT::sign(['userId' => $userData['id']], $config['jwt_secret']);
        $userData['coins'] = (float)($userData['coins'] ?? $userData['minutes'] ?? 0);

        jsonResponse([
            'token'     => $token,
            'user'      => $userData,
            'isNewUser' => empty($userData['name'])
        ]);
    }

    // ── GET /auth/me ───────────────────────────────────────────────────────────
    if ($subRoute === 'me' && $method === 'GET') {
        if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
        jsonResponse(['user' => $user]);
    }

    jsonResponse(['error' => 'Auth endpoint not found'], 404);
}
