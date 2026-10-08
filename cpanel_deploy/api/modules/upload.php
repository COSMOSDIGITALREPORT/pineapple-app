<?php
// ==============================================================================
// Pineapple App — Local Disk Image Upload Module (Avatar CDN)
// Saves files directly to /uploads/ with zero external Cloudinary dependency!
// ==============================================================================

if (!defined('PINEAPPLE_APP')) die('Direct access forbidden');

function handleUploadRoute(string $subRoute, string $method, array $body, ?array $user): void {
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);

    if ($method !== 'POST') {
        jsonResponse(['error' => 'POST method required'], 405);
    }

    if (!isset($_FILES['image']) && !isset($_FILES['file']) && !isset($_FILES['photo'])) {
        jsonResponse(['error' => 'No image file uploaded'], 400);
    }

    $file = $_FILES['image'] ?? $_FILES['file'] ?? $_FILES['photo'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['error' => 'Upload error code: ' . $file['error']], 400);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!in_array($ext, $allowed)) {
        jsonResponse(['error' => 'Only JPG, PNG, WEBP and GIF images are allowed.'], 400);
    }

    $uploadDir = dirname(dirname(__DIR__)) . '/uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filename = 'avatar_' . uniqid() . '.' . $ext;
    $targetPath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'];
        $publicUrl = $protocol . $host . '/uploads/' . $filename;

        // Auto-update user's avatar_url in database
        $db = Database::getConnection();
        $db->prepare('UPDATE users SET avatar_url = ? WHERE id = ?')->execute([$publicUrl, $user['id']]);

        jsonResponse([
            'success'   => true,
            'url'       => $publicUrl,
            'avatarUrl' => $publicUrl
        ]);
    } else {
        jsonResponse(['error' => 'Failed to save file to uploads directory.'], 500);
    }
}
