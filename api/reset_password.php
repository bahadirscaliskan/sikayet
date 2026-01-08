<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? null;
$email = $input['email'] ?? null;
$password = $input['password'] ?? null;

if (!$token || !$email || !$password) {
    Response::error('Eksik bilgi', 400);
}

if (strlen($password) < 6) {
    Response::error('Şifre en az 6 karakter olmalıdır', 400);
}

$db = Database::getInstance()->getConnection();

try {
    // 1. Token doğrulama
    // Token var mı ve son 1 saat içinde mi oluşturulmuş?
    // Not: SQLite ise datetime fonksiyonları farklı olabilir, PostgreSQL/MySQL varsayıyoruz (CURRENT_TIMESTAMP)
    // PostgreSQL için: created_at > NOW() - INTERVAL '1 hour'
    $stmt = $db->prepare("
        SELECT * FROM password_resets 
        WHERE email = :email 
        AND token = :token 
        AND created_at > NOW() - INTERVAL '1 hour'
    ");
    
    $stmt->execute([
        'email' => $email,
        'token' => $token
    ]);
    
    $resetRequest = $stmt->fetch();

    if (!$resetRequest) {
        Response::error('Geçersiz veya süresi dolmuş sıfırlama bağlantısı', 400);
    }

    // 2. Şifre güncelleme
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    $updateStmt = $db->prepare("UPDATE users SET password_hash = :password_hash WHERE email = :email");
    $updateStmt->execute([
        'password_hash' => $passwordHash,
        'email' => $email
    ]);

    // 3. Token'ı sil (Tek kullanımlık olması için)
    $deleteStmt = $db->prepare("DELETE FROM password_resets WHERE email = :email");
    $deleteStmt->execute(['email' => $email]);

    Response::success(null, 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.');

} catch (PDOException $e) {
    error_log("Reset Password Error: " . $e->getMessage());
    // SQL hatası dönebilir (örn NOW() hatası DB tipine göre)
    Response::error('Şifre sıfırlanırken bir hata oluştu', 500);
}
