<?php
/**
 * API Test Script - Hata ayıklama için
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/core/Auth.php';

echo "=== API Test ===\n\n";

// Session kontrolü
echo "Session Status: " . session_status() . "\n";
echo "Session ID: " . session_id() . "\n";
echo "Session Data: ";
print_r($_SESSION);
echo "\n";

// Auth kontrolü
$auth = new Auth();
$user = $auth->checkAuth();

if ($user) {
    echo "✓ Kullanıcı oturum açmış:\n";
    print_r($user);
} else {
    echo "✗ Kullanıcı oturum açmamış\n";
}

// Veritabanı bağlantısı
try {
    $db = Database::getInstance()->getConnection();
    echo "\n✓ Veritabanı bağlantısı başarılı\n";
    
    // Kullanıcı sayısı
    $stmt = $db->query("SELECT COUNT(*) as count FROM users");
    $count = $stmt->fetch()['count'];
    echo "Toplam kullanıcı sayısı: $count\n";
    
} catch (Exception $e) {
    echo "\n✗ Veritabanı hatası: " . $e->getMessage() . "\n";
}

echo "\n=== Test Tamamlandı ===\n";

