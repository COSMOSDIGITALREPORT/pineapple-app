<?php
// ==============================================================================
// Pineapple App — Support & Inquiries Module
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleSupportRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    $db = Database::getConnection();

    // ── GET /support/messages ─────────────────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT * FROM support_messages WHERE user_id = ? ORDER BY created_at ASC');
        $stmt->execute([$user['id']]);
        jsonResponse($stmt->fetchAll());
    }

    // ── POST /support/send ────────────────────────────────────────────────────
    if ($method === 'POST') {
        $msg = trim($body['message'] ?? $body['text'] ?? '');
        if (!$msg) jsonResponse(['error' => 'Message cannot be empty'], 400);

        $id = uniqid('sup_', true);
        $stmt = $db->prepare('INSERT INTO support_messages (id, user_id, message, status) VALUES (?, ?, ?, "pending")');
        $stmt->execute([$id, $user['id'], $msg]);

        jsonResponse([
            'success' => true,
            'id'      => $id,
            'message' => $msg
        ]);
    }

    jsonResponse(['error' => 'Support route not found'], 404);
}
