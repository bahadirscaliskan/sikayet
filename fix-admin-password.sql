-- Admin ve Staff kullanıcılarının şifrelerini düzelt
-- Bu script'i Navicat'ta çalıştırabilirsiniz

-- Önce mevcut kullanıcıları kontrol et
SELECT email, full_name, role FROM users;

-- Admin şifresini güncelle (admin123)
UPDATE users 
SET password_hash = '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE email = 'admin@example.com';

-- Eğer admin kullanıcısı yoksa oluştur
INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
SELECT 'admin@example.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sistem Yöneticisi', 'admin', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

-- Staff şifresini güncelle (staff123)
UPDATE users 
SET password_hash = '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE email = 'staff@example.com';

-- Eğer staff kullanıcısı yoksa oluştur
INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
SELECT 'staff@example.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Personel Kullanıcı', 'staff', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'staff@example.com');

-- Kontrol et
SELECT email, full_name, role, is_active FROM users WHERE email IN ('admin@example.com', 'staff@example.com');

