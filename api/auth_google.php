<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$credential = $input['credential'] ?? null;

if (!$credential) {
    Response::error('Google kimlik bilgisi eksik', 400);
}

try {
    // 1. Token'ı Google API ile doğrula
    // Kütüphane kullanmadan basit doğrulama
    $url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . $credential;
    $response = @file_get_contents($url);
    
    if ($response === false) {
        throw new Exception('Google token doğrulanamadı');
    }
    
    $payload = json_decode($response, true);
    
    if (!$payload || !isset($payload['email'])) {
        throw new Exception('Geçersiz Google token yanıtı');
    }
    
    // NOT: Production'da 'aud' (Client ID) kontrolü yapılmalı
    // if ($payload['aud'] !== 'YOUR_CLIENT_ID') { ... }

    $email = $payload['email'];
    $fullName = $payload['name'] ?? explode('@', $email)[0];
    $googleId = $payload['sub'];
    $picture = $payload['picture'] ?? null;
    $emailVerified = $payload['email_verified'] === 'true' || $payload['email_verified'] === true; // true string or bool

    $db = Database::getInstance()->getConnection();
    
    // 2. Kullanıcıyı bul veya oluştur
    $stmt = $db->prepare("SELECT * FROM users WHERE email = :email");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Yeni kullanıcı oluştur (Varsayılan şifre ile - Google ile girenler şifre bilmez ama resetleyebilir)
        $randomPassword = bin2hex(random_bytes(16));
        $passwordHash = password_hash($randomPassword, PASSWORD_DEFAULT);
        
        $insertStmt = $db->prepare("
            INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active)
            VALUES (:email, :password_hash, :full_name, 'citizen', :email_verified, true)
            RETURNING id, role
        ");
        
        $insertStmt->execute([
            'email' => $email,
            'password_hash' => $passwordHash,
            'full_name' => $fullName,
            'email_verified' => $emailVerified ? 'true' : 'false' // Boolean olarak saklıyorsak
        ]);
        
        $user = $insertStmt->fetch();
        $userId = $user['id'];
        $role = $user['role'];
        $isNew = true;
    } else {
        $userId = $user['id'];
        $role = $user['role'];
        $isNew = false;
        
        // Mevcut kullanıcıyı Google ile işaretle veya güncelle (isteğe bağlı)
        if ($emailVerified && !$user['email_verified']) {
             $updateStmt = $db->prepare("UPDATE users SET email_verified = true WHERE id = :id");
             $updateStmt->execute(['id' => $userId]);
        }
    }
    
    // 3. Token oluştur ve giriş yap
    $auth = new Auth();
    $loginResult = $auth->loginById($userId);
    
    if ($loginResult['success']) {
        Response::success($loginResult['user'], 'Giriş başarılı');
    } else {
        Response::error($loginResult['message'], 401);
    }
    
} catch (Exception $e) {
    error_log("Google Auth Error: " . $e->getMessage());
    Response::error('Google ile giriş yapılamadı: ' . $e->getMessage(), 401);
}
