-- Leadership History: former hospital leaders in chronological order
-- Compatible with the existing Deder/Loke MySQL schema

CREATE TABLE IF NOT EXISTS leadership_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  bio TEXT NULL,
  short_bio VARCHAR(500) NULL,
  photo_id BIGINT UNSIGNED NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  tenure_start DATE NULL,
  tenure_end DATE NULL,
  achievements TEXT NULL,
  education TEXT NULL,
  `order` INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_leadership_history_active (is_active),
  INDEX idx_leadership_history_order (`order`),
  INDEX idx_leadership_history_tenure (tenure_start),
  CONSTRAINT fk_leadership_history_photo
    FOREIGN KEY (photo_id) REFERENCES media(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
