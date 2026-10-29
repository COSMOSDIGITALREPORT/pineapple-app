<?php
// ==============================================================================
// Pineapple App — Users Profile & Directory Module
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleUsersRoute(string $subRoute, string $method, array $body, ?array $user): void {
    $db = Database::getConnection();

    // ── GET /users/live (Online Hosts for Connect Screen) ─────────────────────
    if ($subRoute === 'live' && $method === 'GET') {
        $stmt = $db->query("
            SELECT id, name, gender, city, language, bio, avatar_url, 
                   CASE WHEN is_live = 1 THEN 1 ELSE 0 END AS is_online, 
                   is_live, rating, total_calls
            FROM users
            WHERE gender IN ('girl', 'female') AND is_blocked = 0 AND is_verified = 1
            ORDER BY is_live DESC, is_online DESC, rating DESC, total_calls DESC
            LIMIT 50
        ");
        jsonResponse($stmt->fetchAll());
    }

    // ── GET /users/top (Top Girls for Leaderboard) ────────────────────────────
    if ($subRoute === 'top' && $method === 'GET') {
        $stmt = $db->query("
            SELECT id, name, gender, city, avatar_url, 
                   CASE WHEN is_live = 1 THEN 1 ELSE 0 END AS is_online, 
                   is_live, rating, total_calls
            FROM users
            WHERE gender IN ('girl', 'female') AND is_blocked = 0
            ORDER BY total_calls DESC, rating DESC
            LIMIT 30
        ");
        jsonResponse($stmt->fetchAll());
    }

    // ── POST /users/status (Online / Offline Socket/Presence Toggle) ──────────
    if ($subRoute === 'status' && $method === 'POST') {
        if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
        $isGirl = in_array(strtolower($user['gender'] ?? ''), ['girl', 'female']);
        if ($isGirl) {
            // For female host, online presence is strictly tied to is_live
            $stmt = $db->prepare('UPDATE users SET is_online = CASE WHEN is_live = 1 THEN 1 ELSE 0 END, last_seen = datetime("now") WHERE id = ?');
            $stmt->execute([$user['id']]);
            $isOnline = !empty($user['is_live']);
        } else {
            $isOnline = !empty($body['isOnline']);
            $stmt = $db->prepare('UPDATE users SET is_online = ?, last_seen = datetime("now") WHERE id = ?');
            $stmt->execute([$isOnline ? 1 : 0, $user['id']]);
            Firebase::setPresence($user['id'], $isOnline);
        }
        jsonResponse(['success' => true, 'is_online' => $isOnline]);
    }

    // ── POST /users/live-status (Persistent Host Live Toggle) ─────────────────
    if ($subRoute === 'live-status' && $method === 'POST') {
        if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
        $isLive = isset($body['isLive']) ? (!empty($body['isLive']) ? 1 : 0) : 0;

        $stmt = $db->prepare('UPDATE users SET is_live = ?, is_online = ?, last_seen = datetime("now") WHERE id = ?');
        $stmt->execute([$isLive, $isLive, $user['id']]);

        Firebase::setPresence($user['id'], (bool)$isLive);
        jsonResponse(['success' => true, 'is_live' => $isLive, 'is_online' => $isLive]);
    }

    // ── PUT /users/profile (Update Profile) ───────────────────────────────────
    if ($subRoute === 'profile' && $method === 'PUT') {
        if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);

        $name      = $body['name'] ?? $user['name'];
        $bio       = $body['bio'] ?? $user['bio'];
        $language  = $body['language'] ?? $user['language'];
        $city      = $body['city'] ?? $user['city'];
        $avatarUrl = $body['avatar_url'] ?? $user['avatar_url'];

        $stmt = $db->prepare('UPDATE users SET name = ?, bio = ?, language = ?, city = ?, avatar_url = ? WHERE id = ?');
        $stmt->execute([$name, $bio, $language, $city, $avatarUrl, $user['id']]);

        $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $updated = $stmt->fetch();
        $updated['coins'] = (float)($updated['coins'] ?? $updated['minutes'] ?? 0);

        jsonResponse(['success' => true, 'user' => $updated]);
    }

    // ── POST /users/rating (Submit Call Rating & Review) ─────────────────────
    if ($subRoute === 'rating' && $method === 'POST') {
        if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);

        $ratedId    = trim($body['ratedId'] ?? '');
        $stars      = max(1, min(5, (int)($body['stars'] ?? 5)));
        $reviewText = trim($body['reviewText'] ?? $body['comment'] ?? '');
        $tags       = isset($body['tags']) ? json_encode($body['tags']) : null;
        $callId     = $body['callId'] ?? null;

        if (!$ratedId) jsonResponse(['error' => 'ratedId required'], 400);

        $stmt = $db->prepare('INSERT INTO user_ratings (id, rater_id, rated_id, call_id, stars, review_text, tags) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([uniqid('rev_', true), $user['id'], $ratedId, $callId, $stars, $reviewText, $tags]);

        // Recalculate average rating for user
        $stmt = $db->prepare('SELECT AVG(stars) as avg_stars FROM user_ratings WHERE rated_id = ?');
        $stmt->execute([$ratedId]);
        $avg = round((float)$stmt->fetchColumn(), 1);

        $db->prepare('UPDATE users SET rating = ? WHERE id = ?')->execute([$avg, $ratedId]);

        jsonResponse(['success' => true, 'newRating' => $avg]);
    }

    // ── Current User Profile GET /users/me ───────────────────────────────────
    if ($subRoute === 'me' && $method === 'GET') {
        if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
        $isGirl = in_array(strtolower($user['gender'] ?? ''), ['girl', 'female']);
        if ($isGirl) {
            $stmt = $db->prepare('UPDATE users SET is_online = CASE WHEN is_live = 1 THEN 1 ELSE 0 END, last_seen = datetime("now") WHERE id = ?');
        } else {
            $stmt = $db->prepare('UPDATE users SET is_online = 1, last_seen = datetime("now") WHERE id = ?');
        }
        $stmt->execute([$user['id']]);

        $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $u = $stmt->fetch();
        if ($u) {
            $u['coins'] = (float)($u['coins'] ?? $u['minutes'] ?? 0);
            jsonResponse($u);
        }
        jsonResponse(['error' => 'User not found'], 404);
    }

    // ── Delete Account DELETE /users/me or POST /users/delete-account ────────
    if (($subRoute === 'me' && $method === 'DELETE') || ($subRoute === 'delete-account' && in_array($method, ['POST', 'DELETE']))) {
        if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);

        $userId = $user['id'];
        $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $currUser = $stmt->fetch();

        if ($currUser) {
            $reason = trim($body['reason'] ?? 'Not specified');
            $customFeedback = trim($body['customFeedback'] ?? $body['custom_feedback'] ?? $body['feedback'] ?? '');
            $phone = $currUser['phone'] ?? '';
            $name = $currUser['name'] ?? 'User';
            $gender = $currUser['gender'] ?? 'boy';
            $coins = (float)($currUser['coins'] ?? $currUser['minutes'] ?? 0);
            $regAt = $currUser['created_at'] ?? date('Y-m-d H:i:s');

            // Calculate host earnings if girl
            $hostEarnings = 0.0;
            try {
                $earnStmt = $db->prepare("SELECT COALESCE(SUM(amount_inr), 0) FROM earnings WHERE girl_id = ? AND status = 'cleared'");
                $earnStmt->execute([$userId]);
                $hostEarnings = (float)$earnStmt->fetchColumn();
            } catch (\Throwable $e) {}

            // Archive to past_users table
            $pastId = uniqid('past_', true);
            $ins = $db->prepare('INSERT INTO past_users (id, user_id, phone, name, gender, coins_at_deletion, earnings_at_deletion, reason, custom_feedback, registered_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))');
            $ins->execute([$pastId, $userId, $phone, $name, $gender, $coins, $hostEarnings, $reason, $customFeedback, $regAt]);

            // Clear presence from Firebase if host
            if (class_exists('Firebase')) {
                try {
                    Firebase::setPresence($userId, false);
                } catch (\Throwable $e) {}
            }

            // Remove from active users table
            $db->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Your account has been deleted successfully.'
        ]);
    }

    // ── Single User Profile /users/:id ───────────────────────────────────────
    if ($method === 'GET' && !empty($subRoute)) {
        $stmt = $db->prepare('SELECT id, name, gender, city, language, bio, avatar_url, is_online, rating, total_calls, is_verified FROM users WHERE id = ?');
        $stmt->execute([$subRoute]);
        $u = $stmt->fetch();
        if ($u) jsonResponse($u);
        jsonResponse(['error' => 'User not found'], 404);
    }

    jsonResponse(['error' => 'Endpoint not found'], 404);
}
