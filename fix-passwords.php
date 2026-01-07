<?php
/**
 * Kullanıcı şifrelerini düzelt
 */

require_once __DIR__ . '/config/config.php';

$db = Database::getInstance()->getConnection();

echo "==========================================\n";
echo "Şifreler Güncelleniyor...\n";
echo "==========================================\n\n";

try {
    // Admin şifresini güncelle
    $adminHash = password_hash('admin123', PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE users SET password_hash = :hash WHERE email = 'admin@example.com'");
    $stmt->execute(['hash' => $adminHash]);
    
    if ($stmt->rowCount() > 0) {
        echo "✓ Admin şifresi güncellendi (admin@example.com / admin123)\n";
    } else {
        echo "⚠️  Admin kullanıcısı bulunamadı, oluşturuluyor...\n";
        $stmt = $db->prepare("
            INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
            VALUES ('admin@example.com', :hash, 'Sistem Yöneticisi', 'admin', TRUE, TRUE)
        ");
        $stmt->execute(['hash' => $adminHash]);
        echo "✓ Admin kullanıcısı oluşturuldu\n";
    }
    
    // Staff şifresini güncelle
    $staffHash = password_hash('staff123', PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE users SET password_hash = :hash WHERE email = 'staff@example.com'");
    $stmt->execute(['hash' => $staffHash]);
    
    if ($stmt->rowCount() > 0) {
        echo "✓ Personel şifresi güncellendi (staff@example.com / staff123)\n";
    } else {
        echo "⚠️  Personel kullanıcısı bulunamadı, oluşturuluyor...\n";
        $stmt = $db->prepare("
            INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active) 
            VALUES ('staff@example.com', :hash, 'Personel Kullanıcı', 'staff', TRUE, TRUE)
        ");
        $stmt->execute(['hash' => $staffHash]);
        echo "✓ Personel kullanıcısı oluşturuldu\n";
    }
    
    // Doğrulama
    echo "\nDoğrulama yapılıyor...\n";
    $adminStmt = $db->prepare("SELECT email FROM users WHERE email = 'admin@example.com'");
    $adminStmt->execute();
    $admin = $adminStmt->fetch();
    
    if ($admin && password_verify('admin123', $adminStmt->fetchColumn())) {
        echo "✓ Admin şifresi doğrulandı\n";
    }
    
    echo "\n==========================================\n";
    echo "✅ Şifreler başarıyla güncellendi!\n";
    echo "==========================================\n\n";
    echo "Giriş bilgileri:\n";
    echo "  Admin:    admin@example.com / admin123\n";
    echo "  Personel: staff@example.com / staff123\n";
    
} catch (PDOException $e) {
    echo "❌ HATA: " . $e->getMessage() . "\n";
    exit(1);
}

