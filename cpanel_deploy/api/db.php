<?php
// ==============================================================================
// Pineapple App — Zero-Config SQLite PDO Database Layer
// Automatically initializes database file & schemas on the first request!
// ==============================================================================

if (!defined('PINEAPPLE_APP')) {
    define('PINEAPPLE_APP', true);
}

class Database {
    private static ?PDO $pdo = null;

    public static function getConnection(): PDO {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $dbPath = __DIR__ . '/pineapple.sqlite';
        $isFirstRun = !file_exists($dbPath);

        try {
            self::$pdo = new PDO('sqlite:' . $dbPath);
            self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // Performance optimizations for SQLite
            self::$pdo->exec('PRAGMA journal_mode = WAL;');
            self::$pdo->exec('PRAGMA synchronous = NORMAL;');
            self::$pdo->exec('PRAGMA busy_timeout = 5000;');

            // Auto-initialize tables if needed
            self::initSchema(self::$pdo);

            return self::$pdo;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }

    private static function initSchema(PDO $pdo): void {
        $schema = <<<SQL
        -- 1. Users table (Boys & Girls)
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            phone TEXT UNIQUE,
            name TEXT,
            dob TEXT,
            gender TEXT,
            city TEXT,
            language TEXT DEFAULT 'Hindi',
            bio TEXT,
            avatar_url TEXT,
            coins REAL DEFAULT 500.0,
            minutes REAL DEFAULT 500.0,
            is_premium INTEGER DEFAULT 0,
            is_verified INTEGER DEFAULT 1,
            is_online INTEGER DEFAULT 0,
            is_blocked INTEGER DEFAULT 0,
            fcm_token TEXT,
            rating REAL DEFAULT 5.0,
            total_calls INTEGER DEFAULT 0,
            free_trial_used INTEGER DEFAULT 0,
            intro_9_used INTEGER DEFAULT 0,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. OTP Sessions table
        CREATE TABLE IF NOT EXISTS otp_sessions (
            id TEXT PRIMARY KEY,
            phone TEXT NOT NULL,
            otp TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            is_used INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 3. Calls table
        CREATE TABLE IF NOT EXISTS calls (
            id TEXT PRIMARY KEY,
            caller_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            call_type TEXT DEFAULT 'audio',
            status TEXT DEFAULT 'initiated',
            started_at DATETIME,
            ended_at DATETIME,
            duration_seconds INTEGER DEFAULT 0,
            coins_deducted REAL DEFAULT 0,
            girl_coins REAL DEFAULT 0,
            girl_earnings_inr REAL DEFAULT 0,
            platform_revenue_inr REAL DEFAULT 0,
            agora_channel TEXT,
            free_trial INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 4. Wallet Transactions Ledger
        CREATE TABLE IF NOT EXISTS wallet_transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            ref_id TEXT,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 5. Host Earnings Records
        CREATE TABLE IF NOT EXISTS earnings (
            id TEXT PRIMARY KEY,
            girl_id TEXT NOT NULL,
            call_id TEXT,
            coins_received REAL DEFAULT 0,
            mins_received REAL DEFAULT 0,
            amount_inr REAL DEFAULT 0,
            status TEXT DEFAULT 'cleared',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 6. Withdrawals Requests
        CREATE TABLE IF NOT EXISTS withdrawals (
            id TEXT PRIMARY KEY,
            girl_id TEXT NOT NULL,
            amount REAL NOT NULL,
            fee_amount REAL DEFAULT 0,
            upi_id TEXT NOT NULL,
            same_day INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 7. Gifts Log
        CREATE TABLE IF NOT EXISTS gifts (
            id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            gift_type TEXT NOT NULL,
            coins_spent REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 8. User Ratings & Caller Reviews
        CREATE TABLE IF NOT EXISTS user_ratings (
            id TEXT PRIMARY KEY,
            rater_id TEXT NOT NULL,
            rated_id TEXT NOT NULL,
            call_id TEXT,
            stars INTEGER DEFAULT 5,
            review_text TEXT,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 9. Reports & Moderation
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            reporter_id TEXT NOT NULL,
            reported_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 10. Support & Inquiry Messages
        CREATE TABLE IF NOT EXISTS support_messages (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            message TEXT NOT NULL,
            reply TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            replied_at DATETIME
        );

        -- 11. Spin History
        CREATE TABLE IF NOT EXISTS spin_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            prize TEXT NOT NULL,
            coins_won REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
SQL;

        $pdo->exec($schema);

        // Seed initial verified host profiles if users table is empty
        $stmt = $pdo->query("SELECT COUNT(*) FROM users");
        if ($stmt->fetchColumn() == 0) {
            self::seedInitialHosts($pdo);
        }
    }

    private static function seedInitialHosts(PDO $pdo): void {
        $hosts = [
            [
                'id' => 'host-priya-001',
                'name' => 'Priya Sharma',
                'phone' => '9876543210',
                'gender' => 'girl',
                'city' => 'Mumbai',
                'language' => 'Hindi, English',
                'bio' => 'Friendly conversations, love music and late-night chats ❤️',
                'avatar_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
                'is_online' => 1,
                'is_verified' => 1,
                'rating' => 4.9,
                'coins' => 1250,
                'minutes' => 1250,
            ],
            [
                'id' => 'host-ananya-002',
                'name' => 'Ananya Verma',
                'phone' => '9876543211',
                'gender' => 'girl',
                'city' => 'Delhi',
                'language' => 'Hindi, Punjabi',
                'bio' => 'Cheerful host! Call me to talk about travel, movies & life 🌟',
                'avatar_url' => 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
                'is_online' => 1,
                'is_verified' => 1,
                'rating' => 4.8,
                'coins' => 840,
                'minutes' => 840,
            ],
            [
                'id' => 'host-riya-003',
                'name' => 'Riya Sen',
                'phone' => '9876543212',
                'gender' => 'girl',
                'city' => 'Bangalore',
                'language' => 'English, Bengali',
                'bio' => 'Sweet voice, great listener! Let’s talk about your day 🌸',
                'avatar_url' => 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
                'is_online' => 1,
                'is_verified' => 1,
                'rating' => 5.0,
                'coins' => 1950,
                'minutes' => 1950,
            ]
        ];

        $insertSql = "INSERT INTO users (id, name, phone, gender, city, language, bio, avatar_url, is_online, is_verified, rating, coins, minutes) 
                      VALUES (:id, :name, :phone, :gender, :city, :language, :bio, :avatar_url, :is_online, :is_verified, :rating, :coins, :minutes)";
        $stmt = $pdo->prepare($insertSql);

        foreach ($hosts as $h) {
            $stmt->execute($h);
        }
    }
}
