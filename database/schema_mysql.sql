-- Şikayet ve Görev Yönetim Sistemi - MySQL Veritabanı Şeması
-- Veritabanı oluşturma
CREATE DATABASE IF NOT EXISTS complaint_management_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE complaint_management_system;

-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role ENUM('citizen', 'admin', 'staff') NOT NULL DEFAULT 'citizen',
    email_verified TINYINT(1) DEFAULT 0,
    phone_verified TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active TINYINT(1) DEFAULT 1,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Şikayetler tablosu
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    status ENUM('pending', 'assigned', 'in_progress', 'completed', 'rejected', 'closed') DEFAULT 'pending',
    assigned_to INT,
    assigned_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_complaints_user_id (user_id),
    INDEX idx_complaints_status (status),
    INDEX idx_complaints_assigned_to (assigned_to),
    INDEX idx_complaints_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fotoğraflar tablosu
CREATE TABLE IF NOT EXISTS complaint_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    photo_path VARCHAR(500) NOT NULL,
    photo_type ENUM('before', 'after', 'evidence') DEFAULT 'before',
    uploaded_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_complaint_photos_complaint_id (complaint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Yorumlar/Loglar tablosu
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    is_internal TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comments_complaint_id (complaint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- İşlem geçmişi/Loglar tablosu
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_activity_logs_complaint_id (complaint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bildirimler tablosu
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    complaint_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Örnek admin kullanıcı (şifre: admin123 - production'da değiştirilmeli)
INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
VALUES ('admin@example.com', '$2y$12$uceQ/irOlVEAfhTAZwJiJutB01svH2EBfnbXTFuWfbJ4WgI.M2Ug6', 'Sistem Yöneticisi', 'admin', 1, 1);

-- Örnek personel kullanıcı (şifre: staff123 - production'da değiştirilmeli)
INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
VALUES ('staff@example.com', '$2y$12$yBfofjYmwEpa9TB3wGz6IeovpOGQeTzcGk5MeeysRfskYgcINckK6', 'Personel Kullanıcı', 'staff', 1, 1);
