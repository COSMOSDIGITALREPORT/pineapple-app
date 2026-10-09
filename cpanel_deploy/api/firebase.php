<?php
// ==============================================================================
// Pineapple App — Firebase Realtime Database Signaling Helper
// Ultra-fast HTTP REST publisher for incoming call rings, accepts & hangups!
// ==============================================================================

if (!defined('PINEAPPLE_APP')) {
    define('PINEAPPLE_APP', true);
}

class Firebase {
    private static function getBaseUrl(): string {
        $config = require __DIR__ . '/config.php';
        return rtrim($config['firebase_rtdb_url'], '/');
    }

    /**
     * Sends a real-time event to a user's signal channel
     */
    public static function sendSignal(string $targetUserId, string $event, array $payload): bool {
        $url = self::getBaseUrl() . '/signals/' . urlencode($targetUserId) . '.json';
        
        $data = [
            'event'     => $event,
            'payload'   => $payload,
            'timestamp' => round(microtime(true) * 1000)
        ];

        return self::putRequest($url, $data);
    }

    /**
     * Updates real-time presence (online/offline)
     */
    public static function setPresence(string $userId, bool $isOnline): bool {
        $url = self::getBaseUrl() . '/presence/' . urlencode($userId) . '.json';
        return self::putRequest($url, [
            'is_online' => $isOnline ? 1 : 0,
            'last_seen' => date('Y-m-d H:i:s')
        ]);
    }

    private static function putRequest(string $url, array $data): bool {
        $json = json_encode($data);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($json)
        ]);

        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ($code >= 200 && $code < 300);
    }

    /**
     * Gets a short-lived Google OAuth2 Bearer token for FCM v1 API using service account credentials.
     */
    private static function getGoogleAccessToken(): ?string {
        $credFile = __DIR__ . '/firebase_credentials.json';
        if (!file_exists($credFile)) {
            $rootCred = dirname(__DIR__, 2) . '/firebase_credentials.json';
            if (file_exists($rootCred)) $credFile = $rootCred;
            else return null;
        }

        $cacheFile = sys_get_temp_dir() . '/pineapple_fcm_token.json';
        if (file_exists($cacheFile)) {
            $cached = json_decode(@file_get_contents($cacheFile), true);
            if (!empty($cached['token']) && ($cached['expires_at'] ?? 0) > (time() + 60)) {
                return $cached['token'];
            }
        }

        $creds = json_decode(file_get_contents($credFile), true);
        if (empty($creds['client_email']) || empty($creds['private_key'])) return null;

        $now = time();
        $header = ['alg' => 'RS256', 'typ' => 'JWT'];
        $claims = [
            'iss'   => $creds['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud'   => 'https://oauth2.googleapis.com/token',
            'iat'   => $now,
            'exp'   => $now + 3600
        ];

        $b64Header = self::base64UrlEncode(json_encode($header));
        $b64Claims = self::base64UrlEncode(json_encode($claims));
        $dataToSign = $b64Header . '.' . $b64Claims;

        $signature = '';
        if (!openssl_sign($dataToSign, $signature, $creds['private_key'], OPENSSL_ALGO_SHA256)) {
            return null;
        }

        $jwt = $dataToSign . '.' . self::base64UrlEncode($signature);

        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $jwt
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        $res = curl_exec($ch);
        curl_close($ch);

        $json = json_decode($res, true);
        if (!empty($json['access_token'])) {
            @file_put_contents($cacheFile, json_encode([
                'token'      => $json['access_token'],
                'expires_at' => $now + ($json['expires_in'] ?? 3600)
            ]));
            return $json['access_token'];
        }
        return null;
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Sends an FCM HTTP v1 Push Notification to a device token.
     */
    public static function sendPush(string $token, string $title, string $body, array $data = []): bool {
        $token = trim($token);
        if (!$token) return false;

        $accessToken = self::getGoogleAccessToken();
        if (!$accessToken) return false;

        $credFile = __DIR__ . '/firebase_credentials.json';
        $creds = file_exists($credFile) ? json_decode(file_get_contents($credFile), true) : [];
        $projectId = $creds['project_id'] ?? 'pineapple-8376c';

        $strData = [];
        foreach ($data as $k => $v) {
            $strData[(string)$k] = (string)$v;
        }

        $message = [
            'message' => [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body'  => $body
                ],
                'data' => $strData,
                'android' => [
                    'priority' => 'HIGH',
                    'notification' => [
                        'sound' => 'default',
                        'default_sound' => true,
                        'channel_id' => 'pineapple_default_channel'
                    ]
                ]
            ]
        ];

        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json; charset=UTF-8'
        ]);
        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ($code >= 200 && $code < 300);
    }

    /**
     * Looks up user's active FCM token and sends push notification.
     */
    public static function sendPushToUser(string $userId, string $title, string $body, array $data = []): bool {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('SELECT fcm_token FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            if (!empty($row['fcm_token'])) {
                return self::sendPush($row['fcm_token'], $title, $body, $data);
            }
        } catch (Throwable $e) {}
        return false;
    }
}
