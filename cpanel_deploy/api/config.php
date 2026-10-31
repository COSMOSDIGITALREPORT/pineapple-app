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
    'admin_phone'    => '7020768849',

    // Firebase Realtime Database (for instant Call Ringing & Signaling)
    'firebase_project_id' => 'pineapple-8376c',
    'firebase_credentials_b64' => 'ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAicGluZWFwcGxlLTgzNzZjIiwKICAicHJpdmF0ZV9rZXlfaWQiOiAiYTc0MmIyYTA4YTU4ZDhlZTI0M2ZkOWI5YzNiZTc2MWUwMzAxMTYxNyIsCiAgInByaXZhdGVfa2V5IjogIi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxuTUlJRXZnSUJBREFOQmdrcWhraUc5dzBCQVFFRkFBU0NCS2d3Z2dTa0FnRUFBb0lCQVFEUmJQWFROYnp2VDB6M1xuMTA4c21NeWFUeVpLNWFTRU1ZY1FNVnVDaFFBenc2SjB5YTdtM0doQjhHc2pxc3Z5NGkwbWhFNjFxdm1qYkFYbFxuYnpLTW1rMEYxVGdZbXNDZlVzdGlKMWo5UHJXcUJXNWdzc1E2RWd6ZHJPYnIzUzkyc3BQbzFtdmNJbE1TMHN3QVxuMmhwdWJwWGZnaktpWjJJcHFxNGpRTVpVTFFYTUQ5NU5pWUxDOHFJeWtBKzU4VWRoM09RYWxmeStCZmFpcEtISFxucmtjZmpMdnZlSW5QVmZ0aHFlSk1jZ1hmMXNyUmhXR0svY0JCTnBMMGRnUUFsTW1adnZBaHY4YjYyM1RlbG9KQVxuOVdzN3RLcjlZeFFSMWI4eDIzc25OeVR5VGQ2M1htUEpQeWx2bXlMTlZwUDhjMk50YStvd2pmaWk3WTUybVRybFxuZnpzK2NKLzFBZ01CQUFFQ2dnRUFOQkNYcU5PeVRmaDBGU1dsSEZ3OGVaeDEwNmIxMkp1TGpYNEgxeElEczlyT1xuTjZTd1k5cWwzTWJOakFkNVByLzJJNTQvQnpFamNQcDVHTW9sVWdsR1hzM2NiVm1EeTloRWtmbGdTVTFlMG84WlxuR3RjMnE0MHpQNlV0bjdQVWlmanBocmhRQm1GT0w5N1NNdUFHTkRBditHb2c5bmtuVVY2S2ZsOHJMMkFtRWMzb1xuOWZ3eExwdXVSSE5hUGd3ekRGc1E2K25hOWl2QkoyT1N5bWViVWJEL2Fvdk8zQzl2M2ZHSXVhVGZEdncra3NQOFxuTkJoMVBmOG1FMjBOVjA1MktXMGc2aHJuYnE2UjNzZkZveU1XNlhJRHE4Sjk0TGFZK0JDS1lzRVZiRDAzYUxwS1xuUkxUdy81bVRJaEFzWTR3Mi9OcTY1aXZRUEExVmNLSWRqb3pucXVBTjRRS0JnUUR0dzhuM1NxWk92Q01rdE52bVxubXI0K3ZIcEhaN1RpWE15NnZCVmRzNnJvR0J1MXZERzduNVpPU3hJMzVDNzVEdVVBZkJEdyt5akFxeUJnQ085SVxuNFFiVDVac09lRW11T2FhU05uZzFBaDk5Qzl5TkFRcDRsUTd1eDZ3ZUxySStMZ0VyZHl3eUJsNmRyRE5YVWRYclxuUms0OWJsTUN5d2ZyQmVxRG50OWVPTHJkQ1FLQmdRRGhmTVI1ei8yUDkrNlVuSjhVTC85UHRHTkhtaTYyRzJDY1xudGYyWnNWTk13UnhLcjlIV1hyU3VaakRFU25LajZXVkZJdWFSQzhGZFNLd3Y5VUxtcGhoMzRZU1dyQnpXS1pvQVxuTGN5Q3lFeGwvaC9LYjhScUlLWDd2TFdlbmp2dDM0ejRPdlZDV2FBSHNEbDJkZWdjSkFKaThhdVFWQmYxQk04Y1xubEFBSTVQaFNqUUtCZ1FEUUd6aGhYRk5vUXIrMzF4MUtJRk0zOGh4TTkzYVpVb1JYUlZ5bUlTWUw4MTM5bVhVbVxuTmE2SFpLblRoY09mZHV2MW1xSHhhc1BtcjJHczdPVVRzdklZOGJUZjIyVVNPNStTQmw3OGRwazlCKzdJOUFwSVxuTko5WFhDbElXYkxsUGJzRVlsQ3FrR3lzTVJiVzdPZ0NBQTFuTTNNdzFLaGZpMVFTVkRKSjgvbUtrUUtCZ1FERlxuaG9pT3ROYklnVVlzUlM5TmZlWkhxaHUySTZoN3VtdmRtOGMyRlpLRkVEMTZaNTZJRFpwMWsrdHdhRThZcTJJZFxuT0QrR0hDZ2RVWVlVMU9Md0xkd05XQzdQMXFIRU1kbElBdGErVWp3cXRIeWcxMXZXSkJlQytJS1pHc0FnMXM0a1xudlhFUDJIZEpoT1F4azRQcTh0aHNXSXdUK0xhcjJyU2Jza0o5aUNiSUdRS0JnRi9aam9YeWdNRjJuNHo5UHNKQVxuelVob1Z3eVlsODJBTUU1Zm02Y2YvVWY4cDhML1B5emo1OThXUC9vaWtZR0tSRk1CeGtVSytVRkJRQ3ZrTGgyNFxuMlV2RWk3NlgrbTJxYjZraXpqaHc3U210WVpwa2pqS0Q4VXdMUmFrVTVWMHFpbHlwUEZERWU0aGR2MHpSU2hsd1xuZVRBampYU1loaEw1NzF6R242NHFya280XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLAogICJjbGllbnRfZW1haWwiOiAiZmlyZWJhc2UtYWRtaW5zZGstZmJzdmNAcGluZWFwcGxlLTgzNzZjLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAiY2xpZW50X2lkIjogIjEwMDAwMzY1OTg5ODk4MzIyNTYwMiIsCiAgImF1dGhfdXJpIjogImh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwKICAidG9rZW5fdXJpIjogImh0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuIiwKICAiYXV0aF9wcm92aWRlcl94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL29hdXRoMi92MS9jZXJ0cyIsCiAgImNsaWVudF94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkvZmlyZWJhc2UtYWRtaW5zZGstZmJzdmMlNDBwaW5lYXBwbGUtODM3NmMuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0K',

    'firebase_rtdb_url'   => 'https://pineapple-8376c-default-rtdb.firebaseio.com',

    // Agora RTC (Audio & Video Streams)
    'agora_app_id'          => 'ad82a5692433428ba7b8508f513d1b0b',
    'agora_app_certificate' => '5c7a7a90deed4676be6518dbbebf426e',

    // Razorpay (Payments)
    'razorpay_key_id'     => 'rzp_test_T6EyUZ7PKaClav',
    'razorpay_key_secret' => 'kNSRaj4mEm6pKnBCxl01iK4X',

    // OTP SMS Gateway (Client 2Factor.in Account - pineappleapp544@gmail.com)
    'twofactor_api_key' => '4bd92262-c607-11f1-af74-0200cd936042',

    // Media & Local Storage
    'upload_dir' => dirname(__DIR__) . '/uploads/',
    'upload_url' => '/uploads/',
];
