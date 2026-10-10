<?php
// ==============================================================================
// Pineapple App — Master Front Controller & REST Router (PHP + SQLite)
// ==============================================================================

define('PINEAPPLE_APP', true);

// ── 1. Global Response Headers ────────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── 2. Helper Functions ───────────────────────────────────────────────────────
function jsonResponse($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ── 3. Load Core Libraries ────────────────────────────────────────────────────
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/firebase.php';
$config = require __DIR__ . '/config.php';

// ── 4. Authenticate Request if Bearer Token Present ───────────────────────────
$user = null;
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
    $tokenPayload = JWT::verify($matches[1], $config['jwt_secret']);
    if ($tokenPayload) {
        $db = Database::getConnection();
        if (!empty($tokenPayload['userId'])) {
            $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
            $stmt->execute([$tokenPayload['userId']]);
            $user = $stmt->fetch() ?: null;
            if ($user) {
                $user['coins'] = (float)($user['coins'] ?? $user['minutes'] ?? 0);
                // Keep presence alive on any active app request
                try {
                    $isGirl = in_array(strtolower($user['gender'] ?? ''), ['girl', 'female']);
                    if ($isGirl) {
                        // Female host's online presence is strictly tied to her Live toggle (is_live)
                        $db->prepare('UPDATE users SET is_online = CASE WHEN is_live = 1 THEN 1 ELSE 0 END, last_seen = datetime("now") WHERE id = ?')->execute([$tokenPayload['userId']]);
                    } else {
                        $db->prepare('UPDATE users SET is_online = 1, last_seen = datetime("now") WHERE id = ?')->execute([$tokenPayload['userId']]);
                    }
                } catch (\Throwable $_) {}
            }
        } elseif (!empty($tokenPayload['role']) && $tokenPayload['role'] === 'admin') {
            $user = ['id' => 'admin', 'role' => 'admin', 'name' => $tokenPayload['name'] ?? 'Admin'];
        }
    }
}

// ── 5. Parse Route & Request Body ─────────────────────────────────────────────
$rawRoute = $_GET['route'] ?? '';
$rawRoute = trim(parse_url($rawRoute, PHP_URL_PATH), '/');

// Parse JSON Body
$rawBody = file_get_contents('php://input');
$body = [];
if ($rawBody) {
    $parsed = json_decode($rawBody, true);
    if (is_array($parsed)) $body = $parsed;
}
$body = array_merge($_POST, $body);

$method = $_SERVER['REQUEST_METHOD'];

// Health check endpoint
if ($rawRoute === '' || $rawRoute === 'health') {
    jsonResponse([
        'status'    => 'ok',
        'platform'  => 'Pineapple cPanel PHP Engine',
        'database'  => 'SQLite Auto-WAL',
        'signaling' => 'Firebase Realtime Database',
        'time'      => date('c')
    ]);
}

// ── 6. Modular Route Dispatcher ───────────────────────────────────────────────
$parts = explode('/', $rawRoute);
$module = strtolower($parts[0] ?? '');
$subRoute = implode('/', array_slice($parts, 1));

switch ($module) {
    case 'auth':
        require_once __DIR__ . '/modules/auth.php';
        handleAuthRoute($subRoute, $method, $body, $user);
        break;

    case 'users':
        require_once __DIR__ . '/modules/users.php';
        handleUsersRoute($subRoute, $method, $body, $user);
        break;

    case 'calls':
        require_once __DIR__ . '/modules/calls.php';
        handleCallsRoute($subRoute, $method, $body, $user);
        break;

    case 'wallet':
        require_once __DIR__ . '/modules/wallet.php';
        handleWalletRoute($subRoute, $method, $body, $user);
        break;

    case 'payment':
        require_once __DIR__ . '/modules/payment.php';
        handlePaymentRoute($subRoute, $method, $body, $user);
        break;

    case 'earnings':
        require_once __DIR__ . '/modules/earnings.php';
        handleEarningsRoute($subRoute, $method, $body, $user);
        break;

    case 'withdrawals':
        require_once __DIR__ . '/modules/withdrawals.php';
        handleWithdrawalsRoute($subRoute, $method, $body, $user);
        break;

    case 'spin':
        require_once __DIR__ . '/modules/spin.php';
        handleSpinRoute($subRoute, $method, $body, $user);
        break;

    case 'admin':
        require_once __DIR__ . '/modules/admin.php';
        handleAdminRoute($subRoute, $method, $body, $user);
        break;

    case 'support':
        require_once __DIR__ . '/modules/support.php';
        handleSupportRoute($subRoute, $method, $body, $user);
        break;

    case 'upload':
        require_once __DIR__ . '/modules/upload.php';
        handleUploadRoute($subRoute, $method, $body, $user);
        break;

    default:
        jsonResponse(['error' => 'API route not found: /' . $rawRoute], 404);
}
