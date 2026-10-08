<?php
// ==============================================================================
// Pineapple App — Pure PHP JWT Helper (HMAC-SHA256, Zero External Dependencies)
// ==============================================================================

if (!defined('PINEAPPLE_APP')) {
    define('PINEAPPLE_APP', true);
}

class JWT {
    private static function base64UrlEncode(string $data): string {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    private static function base64UrlDecode(string $data): string {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
    }

    public static function sign(array $payload, string $secret, int $expirySeconds = 2592000): string {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload['exp'] = time() + $expirySeconds;

        $base64Header  = self::base64UrlEncode(json_encode($header));
        $base64Payload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, $secret, true);
        $base64Signature = self::base64UrlEncode($signature);

        return $base64Header . '.' . $base64Payload . '.' . $base64Signature;
    }

    public static function verify(string $token, string $secret): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$headerB64, $payloadB64, $sigB64] = $parts;

        $expectedSig = self::base64UrlEncode(hash_hmac('sha256', $headerB64 . '.' . $payloadB64, $secret, true));
        if (!hash_equals($expectedSig, $sigB64)) return null;

        $payload = json_decode(self::base64UrlDecode($payloadB64), true);
        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) return null;

        return $payload;
    }
}
