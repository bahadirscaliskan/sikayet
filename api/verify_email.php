<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

$token = $_GET['token'] ?? null;

if (!$token) {
    die('Geçersiz doğrulama anahtarı');
}

$db = Database::getInstance()->getConnection();

try {
    // Token'ı bul
    $stmt = $db->prepare("SELECT id FROM users WHERE verification_token = :token");
    $stmt->execute(['token' => $token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        die('Geçersiz veya süresi dolmuş doğrulama anahtarı');
    }
    
    // Kullanıcıyı doğrulanmış olarak işaretle
    $updateStmt = $db->prepare("
        UPDATE users 
        SET email_verified = true, verification_token = NULL 
        WHERE id = :id
    ");
    $updateStmt->execute(['id' => $user['id']]);
    
    // Başarılı mesajı ve yönlendirme
    echo "
        <html>
        <head>
            <title>Doğrulama Başarılı</title>
            <meta http-equiv='refresh' content='3;url=/index.html' />
            <style>
                body { font-family: sans-serif; text-align: center; padding-top: 50px; }
                .success { color: green; font-size: 24px; }
            </style>
        </head>
        <body>
            <div class='success'>E-posta adresiniz başarıyla doğrulandı!</div>
            <p>Giriş sayfasına yönlendiriliyorsunuz...</p>
        </body>
        </html>
    ";
    
} catch (PDOException $e) {
    error_log("Verification Error: " . $e->getMessage());
    die('Doğrulama sırasında bir hata oluştu');
}
