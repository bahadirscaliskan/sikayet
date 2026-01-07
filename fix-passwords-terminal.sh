#!/bin/bash

# Terminal'den şifreleri düzelt

echo "Şifreler güncelleniyor..."

PGPASSWORD='1q2w3e' psql -h localhost -p 5432 -U bahadir -d complaint_management_system <<EOF

-- Admin şifresini güncelle (admin123)
UPDATE users 
SET password_hash = '\$2y\$12\$uceQ/irOlVEAfhTAZwJiJutB01svH2EBfnbXTFuWfbJ4WgI.M2Ug6'
WHERE email = 'admin@example.com';

-- Staff şifresini güncelle (staff123)
UPDATE users 
SET password_hash = '\$2y\$12\$yBfofjYmwEpa9TB3wGz6IeovpOGQeTzcGk5MeeysRfskYgcINckK6'
WHERE email = 'staff@example.com';

-- Eğer kullanıcılar yoksa oluştur
INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
SELECT 'admin@example.com', '\$2y\$12\$uceQ/irOlVEAfhTAZwJiJutB01svH2EBfnbXTFuWfbJ4WgI.M2Ug6', 'Sistem Yöneticisi', 'admin', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
SELECT 'staff@example.com', '\$2y\$12\$yBfofjYmwEpa9TB3wGz6IeovpOGQeTzcGk5MeeysRfskYgcINckK6', 'Personel Kullanıcı', 'staff', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'staff@example.com');

-- Kontrol et
SELECT email, full_name, role, is_active FROM users WHERE email IN ('admin@example.com', 'staff@example.com');

EOF

echo ""
echo "✅ Şifreler güncellendi!"
echo "Giriş bilgileri:"
echo "  Admin:    admin@example.com / admin123"
echo "  Personel: staff@example.com / staff123"

