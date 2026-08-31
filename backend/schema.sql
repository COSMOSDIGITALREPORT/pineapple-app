-- Pineapple MySQL Schema
-- Run: mysql -u root -p pineapple < schema.sql

CREATE DATABASE IF NOT EXISTS pineapple;
USE pineapple;

CREATE TABLE IF NOT EXISTS users (
  id           CHAR(36)     PRIMARY KEY,
  phone        VARCHAR(15)  UNIQUE NOT NULL,
  name         VARCHAR(100),
  dob          DATE,
  gender       VARCHAR(10),
  city         VARCHAR(100),
  language     VARCHAR(50),
  bio          TEXT,
  avatar_url   TEXT,
  coins        INT          DEFAULT 500,
  is_premium   TINYINT(1)   DEFAULT 0,
  plan_id      VARCHAR(20),
  plan_expires_at DATETIME,
  is_verified  TINYINT(1)   DEFAULT 0,
  is_online    TINYINT(1)   DEFAULT 0,
  fcm_token    TEXT,
  last_seen    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_sessions (
  id         CHAR(36)   PRIMARY KEY,
  phone      VARCHAR(15) NOT NULL,
  otp        VARCHAR(6)  NOT NULL,
  expires_at DATETIME    NOT NULL,
  is_used    TINYINT(1)  DEFAULT 0,
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
);

CREATE TABLE IF NOT EXISTS calls (
  id               CHAR(36)    PRIMARY KEY,
  caller_id        CHAR(36),
  receiver_id      CHAR(36),
  call_type        VARCHAR(10) DEFAULT 'audio',
  status           VARCHAR(20) DEFAULT 'initiated',
  started_at       DATETIME,
  ended_at         DATETIME,
  duration_seconds INT         DEFAULT 0,
  coins_deducted   INT         DEFAULT 0,
  agora_channel    VARCHAR(100),
  created_at       DATETIME    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caller_id)   REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          CHAR(36)    PRIMARY KEY,
  user_id     CHAR(36)    NOT NULL,
  type        VARCHAR(20) NOT NULL,
  amount      INT         NOT NULL,
  description TEXT,
  ref_id      CHAR(36),
  created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS earnings (
  id             CHAR(36)    PRIMARY KEY,
  girl_id        CHAR(36)    NOT NULL,
  call_id        CHAR(36),
  coins_received INT         DEFAULT 0,
  amount_inr     DECIMAL(10,2) DEFAULT 0,
  status         VARCHAR(20) DEFAULT 'pending',
  created_at     DATETIME    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (girl_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_girl (girl_id)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id         CHAR(36)      PRIMARY KEY,
  girl_id    CHAR(36)      NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  upi_id     VARCHAR(100)  NOT NULL,
  status     VARCHAR(20)   DEFAULT 'pending',
  note       TEXT,
  created_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (girl_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rooms (
  id             CHAR(36)    PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  topic          VARCHAR(200),
  host_id        CHAR(36),
  language       VARCHAR(50),
  is_live        TINYINT(1)  DEFAULT 1,
  listener_count INT         DEFAULT 0,
  agora_channel  VARCHAR(100),
  created_at     DATETIME    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS room_members (
  id        CHAR(36)   PRIMARY KEY,
  room_id   CHAR(36)   NOT NULL,
  user_id   CHAR(36)   NOT NULL,
  role      VARCHAR(20) DEFAULT 'listener',
  joined_at DATETIME   DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_room_user (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gifts (
  id          CHAR(36)   PRIMARY KEY,
  sender_id   CHAR(36),
  receiver_id CHAR(36),
  gift_type   VARCHAR(50),
  coins_spent INT,
  created_at  DATETIME   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)   REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS spin_history (
  id           CHAR(36)   PRIMARY KEY,
  user_id      CHAR(36)   NOT NULL,
  reward_type  VARCHAR(20),
  reward_value INT,
  spun_at      DATETIME   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id         CHAR(36)    PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  type       VARCHAR(30),
  title      VARCHAR(200),
  body       TEXT,
  data       JSON,
  is_read    TINYINT(1)  DEFAULT 0,
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

-- Seed coin packages
CREATE TABLE IF NOT EXISTS coin_packages (
  id         VARCHAR(20)   PRIMARY KEY,
  coins      INT           NOT NULL,
  price_inr  INT           NOT NULL,
  label      VARCHAR(50),
  is_popular TINYINT(1)    DEFAULT 0
);

INSERT IGNORE INTO coin_packages (id, coins, price_inr, label, is_popular) VALUES
('pack_100',  120, 100, '120 Coins', 0),
('pack_200',  240, 200, '240 Coins', 0),
('pack_500',  700, 500, '700 Coins', 1);

CREATE TABLE IF NOT EXISTS reports (
  id           CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  reporter_id  CHAR(36),
  reported_id  CHAR(36),
  reason       VARCHAR(200),
  status       VARCHAR(20)  DEFAULT 'pending',
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_reported (reported_id)
);

CREATE TABLE IF NOT EXISTS user_ratings (
  id           CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  rater_id     CHAR(36),
  rated_id     CHAR(36),
  call_id      CHAR(36),
  stars        TINYINT      DEFAULT 5,
  review_text  TEXT,
  tags         JSON,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rated (rated_id),
  INDEX idx_rater (rater_id)
);
