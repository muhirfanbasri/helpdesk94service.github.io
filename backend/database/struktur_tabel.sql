-- Tabel services
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_date DATE NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    service_type VARCHAR(100),
    price DECIMAL(15,2) NOT NULL,
    service_stock_sku VARCHAR(128) DEFAULT NULL,
    member_status VARCHAR(20),
    payment_status VARCHAR(20),
    notes TEXT,
    member_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel expenses
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_date DATE NOT NULL,
    category VARCHAR(100),
    description VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME NULL,
    photo VARCHAR(255) DEFAULT NULL
);
