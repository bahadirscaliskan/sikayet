-- Navicat'ta çalıştırın: Şifreleri düzelt
-- complaint_management_system veritabanında çalıştırın

-- Admin şifresini güncelle (admin123)
UPDATE users 
SET password_hash = '$2y$12$uceQ/irOlVEAfhTAZwJiJutB01svH2EBfnbXTFuWfbJ4WgI.M2Ug6'
WHERE email = 'admin@example.com';

-- Staff şifresini güncelle (staff123)
UPDATE users 
SET password_hash = '$2y$12$yBfofjYmwEpa9TB3wGz6IeovpOGQeTzcGk5MeeysRfskYgcINckK6'
WHERE email = 'staff@example.com';

-- Eğer kullanıcılar yoksa oluştur
INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
SELECT 'admin@example.com', '$2y$12$uceQ/irOlVEAfhTAZwJiJutB01svH2EBfnbXTFuWfbJ4WgI.M2Ug6', 'Sistem Yöneticisi', 'admin', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
SELECT 'staff@example.com', '$2y$12$yBfofjYmwEpa9TB3wGz6IeovpOGQeTzcGk5MeeysRfskYgcINckK6', 'Personel Kullanıcı', 'staff', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'staff@example.com');

-- Kontrol et
SELECT email, full_name, role, is_active FROM users WHERE email IN ('admin@example.com', 'staff@example.com');

