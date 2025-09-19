-- Contoh data untuk tabel services
INSERT INTO services (service_date, customer_name, customer_phone, service_type, price, member_status, payment_status, notes, member_id)
VALUES
('2025-08-30', 'Budi Santoso', '08123456789', 'Ganti LCD', 350000, 'Member', 'Sudah Bayar', 'LCD Samsung A52', 1),
('2025-08-29', 'Siti Nurhaliza', '08234567890', 'Service Software', 75000, 'Bukan Member', 'Belum Bayar', 'Install ulang Android', NULL),
('2025-08-28', 'Ahmad Rizki', '08345678901', 'Ganti Baterai', 150000, 'Member', 'Sudah Bayar', 'Baterai iPhone 12', 2);

-- Contoh data untuk tabel expenses
INSERT INTO expenses (expense_date, category, description, amount, notes)
VALUES
('2025-08-30', 'Spare Parts', 'LCD Samsung A52', 250000, 'Untuk stock'),
('2025-08-29', 'Operational', 'Listrik bulan Agustus', 150000, 'Tagihan listrik');
