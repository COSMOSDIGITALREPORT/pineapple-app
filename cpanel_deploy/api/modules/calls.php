<?php
// ==============================================================================
// Pineapple App — Calls & Signaling Module (PHP + SQLite + Firebase)
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleCallsRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    $db = Database::getConnection();
    $config = require dirname(__DIR__) . '/config.php';

    // ── POST /calls/request ───────────────────────────────────────────────────
    if ($subRoute === 'request' && $method === 'POST') {
        $receiverId = trim($body['receiverId'] ?? '');
        $callType   = trim($body['callType'] ?? 'audio');

        if (!$receiverId) jsonResponse(['error' => 'Receiver ID required'], 400);

        // Check caller balance
        $callerCoins = (float)($user['coins'] ?? $user['minutes'] ?? 0);
        $minCoinsNeeded = ($callType === 'video') ? 2.0 : 1.0;

        if ($callerCoins < $minCoinsNeeded && empty($user['is_premium'])) {
            jsonResponse(['error' => 'Insufficient coins. Please recharge to make calls.'], 402);
        }

        $callId       = uniqid('call_', true);
        $agoraChannel = 'call_' . substr(md5($callId), 0, 16);

        $stmt = $db->prepare('INSERT INTO calls (id, caller_id, receiver_id, call_type, status, agora_channel) VALUES (?, ?, ?, ?, "initiated", ?)');
        $stmt->execute([$callId, $user['id'], $receiverId, $callType, $agoraChannel]);

        // Publish real-time ring to receiver phone via Firebase RTDB
        $signalPayload = [
            'callId'       => $callId,
            'callerId'     => $user['id'],
            'callerName'   => $user['name'] ?: 'Caller',
            'callerAvatar' => $user['avatar_url'] ?: '',
            'callType'     => $callType,
            'agoraChannel' => $agoraChannel,
            'agoraAppId'   => $config['agora_app_id'],
        ];

        Firebase::sendSignal($receiverId, 'call:incoming', $signalPayload);

        jsonResponse([
            'success'      => true,
            'callId'       => $callId,
            'agoraChannel' => $agoraChannel,
            'agoraAppId'   => $config['agora_app_id'],
        ]);
    }

    // ── POST /calls/accept ────────────────────────────────────────────────────
    if ($subRoute === 'accept' && $method === 'POST') {
        $callId = trim($body['callId'] ?? '');
        if (!$callId) jsonResponse(['error' => 'callId required'], 400);

        $stmt = $db->prepare('SELECT * FROM calls WHERE id = ?');
        $stmt->execute([$callId]);
        $call = $stmt->fetch();
        if (!$call) jsonResponse(['error' => 'Call not found'], 404);

        $db->prepare('UPDATE calls SET status = "connected", started_at = datetime("now") WHERE id = ?')->execute([$callId]);

        // Notify caller that call was accepted
        Firebase::sendSignal($call['caller_id'], 'call:accepted', [
            'callId'       => $callId,
            'agoraChannel' => $call['agora_channel'],
            'agoraAppId'   => $config['agora_app_id'],
        ]);

        jsonResponse([
            'success'      => true,
            'callId'       => $callId,
            'agoraChannel' => $call['agora_channel'],
            'agoraAppId'   => $config['agora_app_id'],
        ]);
    }

    // ── POST /calls/reject ────────────────────────────────────────────────────
    if ($subRoute === 'reject' && $method === 'POST') {
        $callId = trim($body['callId'] ?? '');
        if (!$callId) jsonResponse(['error' => 'callId required'], 400);

        $stmt = $db->prepare('SELECT * FROM calls WHERE id = ?');
        $stmt->execute([$callId]);
        $call = $stmt->fetch();

        if ($call) {
            $db->prepare('UPDATE calls SET status = "rejected", ended_at = datetime("now") WHERE id = ?')->execute([$callId]);
            Firebase::sendSignal($call['caller_id'], 'call:rejected', ['callId' => $callId]);
        }

        jsonResponse(['success' => true]);
    }

    // ── POST /calls/end ───────────────────────────────────────────────────────
    if ($subRoute === 'end' && $method === 'POST') {
        $callId          = trim($body['callId'] ?? '');
        $durationSeconds = (int)($body['durationSeconds'] ?? $body['duration'] ?? 0);

        if (!$callId) jsonResponse(['error' => 'callId required'], 400);

        $stmt = $db->prepare('SELECT * FROM calls WHERE id = ?');
        $stmt->execute([$callId]);
        $call = $stmt->fetch();
        if (!$call) jsonResponse(['error' => 'Call not found'], 404);

        $ratePerMin = ($call['call_type'] === 'video') ? 2.0 : 1.0;
        $minsTalked = max(1, ceil($durationSeconds / 60));
        $coinsCharged = (float)($minsTalked * $ratePerMin);

        // 70% share to host girl, 0.50 INR per coin
        $girlCoins = round($coinsCharged * 0.70, 2);
        $girlInr   = round($girlCoins * 0.50, 2);
        $platCut   = round($coinsCharged - $girlCoins, 2);

        // Update Call
        $upd = $db->prepare('UPDATE calls SET status = "ended", ended_at = datetime("now"), duration_seconds = ?, coins_deducted = ?, girl_coins = ?, girl_earnings_inr = ?, platform_revenue_inr = ? WHERE id = ?');
        $upd->execute([$durationSeconds, $coinsCharged, $girlCoins, $girlInr, $platCut, $callId]);

        // Deduct from caller
        $db->prepare('UPDATE users SET coins = MAX(0, coins - ?), minutes = MAX(0, minutes - ?), total_calls = total_calls + 1 WHERE id = ?')
           ->execute([$coinsCharged, $coinsCharged, $call['caller_id']]);

        // Credit host girl
        $db->prepare('UPDATE users SET coins = coins + ?, minutes = minutes + ?, total_calls = total_calls + 1 WHERE id = ?')
           ->execute([$girlCoins, $girlCoins, $call['receiver_id']]);

        // Log to earnings & ledger
        $db->prepare('INSERT INTO earnings (id, girl_id, call_id, coins_received, mins_received, amount_inr) VALUES (?, ?, ?, ?, ?, ?)')
           ->execute([uniqid('e_', true), $call['receiver_id'], $callId, $girlCoins, $minsTalked, $girlInr]);

        // Signal other party that call has ended
        $otherId = ($user['id'] === $call['caller_id']) ? $call['receiver_id'] : $call['caller_id'];
        Firebase::sendSignal($otherId, 'call:ended', [
            'callId'          => $callId,
            'durationSeconds' => $durationSeconds,
            'coinsCharged'    => $coinsCharged
        ]);

        jsonResponse([
            'success'          => true,
            'duration'         => $durationSeconds,
            'coinsDeducted'    => $coinsCharged,
            'girlEarningsInr'  => $girlInr
        ]);
    }

    // ── GET /calls/history ────────────────────────────────────────────────────
    if ($subRoute === 'history' && $method === 'GET') {
        $stmt = $db->prepare('
            SELECT c.*, 
                   u1.name as caller_name, u1.avatar_url as caller_avatar,
                   u2.name as receiver_name, u2.avatar_url as receiver_avatar
            FROM calls c
            LEFT JOIN users u1 ON c.caller_id = u1.id
            LEFT JOIN users u2 ON c.receiver_id = u2.id
            WHERE c.caller_id = ? OR c.receiver_id = ?
            ORDER BY c.created_at DESC LIMIT 50
        ');
        $stmt->execute([$user['id'], $user['id']]);
        jsonResponse($stmt->fetchAll());
    }

    jsonResponse(['error' => 'Call endpoint not found'], 404);
}
