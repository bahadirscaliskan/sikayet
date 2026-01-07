<?php
/**
 * Veritabanındaki kullanıcıları kontrol et
 */

require_once __DIR__ . '/config/config.php';

$db = Database::getInstance()->getConnection();

echo "==========================================\n";
echo "Kullanıcı Kontrolü\n";
echo "==========================================\n\n";

try {
    // Tüm kullanıcıları listele
    $stmt = $db->query("SELECT id, email, full_name, role, password_hash, is_active FROM users ORDER BY id");
    $users = $stmt->fetchAll();
    
    if (empty($users)) {
        echo "❌ Hiç kullanıcı bulunamadı!\n";
        echo "Veritabanı şeması düzgün yüklenmemiş olabilir.\n";
        exit(1);
    }
    
    echo "Toplam " . count($users) . " kullanıcı bulundu:\n\n";
    
    foreach ($users as $user) {
        echo "ID: {$user['id']}\n";
        echo "Email: {$user['email']}\n";
        echo "Ad: {$user['full_name']}\n";
        echo "Rol: {$user['role']}\n";
        echo "Aktif: " . ($user['is_active'] ? 'Evet' : 'Hayır') . "\n";
        echo "Şifre Hash: " . substr($user['password_hash'], 0, 30) . "...\n";
        
        // Şifre doğrulamasını test et
        $testPasswords = ['admin123', 'staff123'];
        foreach ($testPasswords as $testPwd) {
            if (password_verify($testPwd, $user['password_hash'])) {
                echo "✓ Şifre '$testPwd' ile eşleşiyor\n";
            }
        }
        
        echo "---\n";
    }
    
    // Admin kullanıcısını özellikle kontrol et
    echo "\nAdmin kullanıcısı kontrolü:\n";
    $adminStmt = $db->prepare("SELECT * FROM users WHERE email = 'admin@example.com'");
    $adminStmt->execute();
    $admin = $adminStmt->fetch();
    
    if ($admin) {
        echo "✓ Admin kullanıcısı bulundu\n";
        echo "Şifre testi:\n";
        
        if (password_verify('admin123', $admin['password_hash'])) {
            echo "✓ 'admin123' şifresi DOĞRU\n";
        } else {
            echo "❌ 'admin123' şifresi YANLIŞ\n";
            echo "Şifre hash'i güncelleniyor...\n";
            
            $newHash = password_hash('admin123', PASSWORD_DEFAULT);
            $updateStmt = $db->prepare("UPDATE users SET password_hash = :hash WHERE email = 'admin@example.com'");
            $updateStmt->execute(['hash' => $newHash]);
            echo "✓ Şifre hash'i güncellendi\n";
        }
    } else {
        echo "❌ Admin kullanıcısı bulunamadı!\n";
    }
    
} catch (PDOException $e) {
    echo "❌ HATA: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n==========================================\n";
echo "Kontrol tamamlandı\n";
echo "==========================================\n";

