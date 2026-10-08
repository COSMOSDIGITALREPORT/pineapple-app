<?php
// ==============================================================================
// Pineapple App — cPanel API Configuration
// ==============================================================================

if (!defined('PINEAPPLE_APP')) {
    define('PINEAPPLE_APP', true);
}

return [
    // Security & Auth
    'jwt_secret'     => 'pineapple-super-secret-jwt-2024',
    'admin_password' => 'Pineapple@2024',

    // Firebase Realtime Database (for instant Call Ringing & Signaling)
    'firebase_project_id' => 'pineapple-8376c',
    'firebase_rtdb_url'   => 'https://pineapple-8376c-default-rtdb.firebaseio.com',

    // Agora RTC (Audio & Video Streams)
    'agora_app_id'          => 'ad82a5692433428ba7b8508f513d1b0b',
    'agora_app_certificate' => '5c7a7a90deed4676be6518dbbebf426e',

    // Razorpay (Payments)
    'razorpay_key_id'     => 'rzp_test_T6EyUZ7PKaClav',
    'razorpay_key_secret' => 'kNSRaj4mEm6pKnBCxl01iK4X',

    // OTP SMS / Voice Gateways
    'fast2sms_api_key'  => 'PazQubw6iVrs214GHXItdTSvxUOM0ZCf9mcpgD8LWBYy7qFJNhpZtlfWqT0hubwIgEHeMzFSkLPJdR4y',
    'twofactor_api_key' => '5cfec1bc-7131-11f1-8174-0200cd936042',

    // Media & Local Storage
    'upload_dir' => dirname(__DIR__) . '/uploads/',
    'upload_url' => '/uploads/',
];
