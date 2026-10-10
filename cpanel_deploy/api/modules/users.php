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
            SELECT id, name, gender, city, language, bio, avatar_url, is_online, is_live, rating, total_calls
            FROM users
            WHERE gender IN ('girl', 'female') AND is_blocked = 0 AND is_verified = 1
            ORDER BY is_online DESC, is_live DESC, rating DESC, total_calls DESC
            LIMIT 50
        ");
        jsonResponse($stmt->fetchAll());
    }

    // ── GET /users/top (Top Girls for Leaderboard) ────────────────────────────
    if ($subRoute === 'top' && $method === 'GET') {
        $stmt = $db->query("
            SELECT id, name, gender, city, avatar_url, is_online, is_live, rating, total_calls
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
        $isOnline = !empty($body['isOnline']);

        $stmt = $db->prepare('UPDATE users SET is_online = ?, last_seen = datetime("now") WHERE id = ?');
        $stmt->execute([$isOnline ? 1 : 0, $user['id']]);

        Firebase::setPresence($user['id'], $isOnline);
        jsonResponse(['success' => true, 'is_online' => $isOnline]);
    }

    // ── POST /users/live-status (Persistent Host Live Toggle) ─────────────────
    if ($subRoute === 'live-status' && $method === 'POST') {
        if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
        $isLive = isset($body['isLive']) ? (!empty($body['isLive']) ? 1 : 0) : 1;

        $stmt = $db->prepare('UPDATE users SET is_live = ?, last_seen = datetime("now") WHERE id = ?');
        $stmt->execute([$isLive, $user['id']]);

        jsonResponse(['success' => true, 'is_live' => $isLive]);
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
