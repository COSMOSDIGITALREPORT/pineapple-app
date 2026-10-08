<?php
// ==============================================================================
// Pineapple App — Web Admin Dashboard Module (PHP + SQLite)
// Serves all stats, users, hosts, withdrawals, reports, reviews & economics!
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleAdminRoute(string $subRoute, string $method, array $body, ?array $adminUser): void {
    $db = Database::getConnection();
    $config = require dirname(__DIR__) . '/config.php';

    // ── POST /admin/login ─────────────────────────────────────────────────────
    if ($subRoute === 'login' && $method === 'POST') {
        $password = trim($body['password'] ?? '');
        if ($password !== $config['admin_password']) {
            jsonResponse(['error' => 'Wrong password'], 401);
        }

        $token = JWT::sign(['role' => 'admin', 'name' => 'Pineapple Administrator'], $config['jwt_secret']);
        jsonResponse([
            'token'   => $token,
            'message' => 'Logged in successfully'
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
