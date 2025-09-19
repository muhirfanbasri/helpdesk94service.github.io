-- create_stocks_table.sql
-- Create table for inventory/stok barang

CREATE TABLE IF NOT EXISTS `stocks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku` VARCHAR(64) NOT NULL UNIQUE,
  `barcode` VARCHAR(128) DEFAULT NULL,
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(120) DEFAULT NULL,
  `qty` INT DEFAULT 0,
  `price` DECIMAL(12,2) DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sku` (`sku`)
  ,KEY `idx_barcode` (`barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample inserts (optional)
INSERT INTO `stocks` (`sku`, `barcode`, `name`, `category`, `qty`, `price`, `notes`) VALUES
('SKU-001','BC-0001','Charger USB-C', 'Aksesoris', 25, 75000.00, 'Charger original compatible'),
('SKU-002','BC-0002','Glass Screen Protector', 'Aksesoris', 100, 15000.00, 'Untuk berbagai tipe');
