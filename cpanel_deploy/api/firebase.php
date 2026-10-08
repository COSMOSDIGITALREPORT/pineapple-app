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
}
