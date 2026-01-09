<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

$auth = new Auth();
$db = Database::getInstance()->getConnection();

$user = $auth->requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Sadece GET istekleri kabul edilir', 405);
}

try {
    $stmt = $db->prepare("
        SELECT id, email, full_name, phone, address, role, created_at, last_login, email_verified
        FROM users 
        WHERE id = :id
    ");
    $stmt->execute(['id' => $user['id']]);
    $profile = $stmt->fetch();
    
    if (!$profile) {
        Response::error('Kullanıcı bulunamadı', 404);
    }
    
    Response::success($profile, 'Profil bilgileri başarıyla getirildi');
    
} catch (PDOException $e) {
    error_log("Get Profile Error: " . $e->getMessage());
    Response::error('Profil getirilirken bir hata oluştu', 500);
}

