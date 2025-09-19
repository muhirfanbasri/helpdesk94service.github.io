-- Migration: add service_stock_sku to existing services table
-- Run this on existing databases to add the new nullable column.
ALTER TABLE services
  ADD COLUMN service_stock_sku VARCHAR(128) DEFAULT NULL;
