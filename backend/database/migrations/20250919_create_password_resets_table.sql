-- Migration: create password_resets table
-- Fields: id, email, code, expires_at (datetime), attempts, last_sent (datetime), created_at

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(32) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT DEFAULT 0,
  last_sent DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
