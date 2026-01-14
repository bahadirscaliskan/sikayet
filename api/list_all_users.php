<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

$auth = new Auth();
$db = Database::getInstance()->getConnection();

// Sadece admin yetkisi gerekli
$user = $auth->requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Sadece GET istekleri kabul edilir', 405);
}

try {
    // Sadece aktif kullanıcıları listele (soft delete için)
    $whereClause = "WHERE is_active = true";
    $params = [];
    
    // Rol filtresi
    if (isset($_GET['role']) && !empty($_GET['role'])) {
        $whereClause .= " AND role = :role";
        $params['role'] = $_GET['role'];
    }
    
    // Arama
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $whereClause .= " AND (email LIKE :search OR full_name LIKE :search)";
        $params['search'] = '%' . $_GET['search'] . '%';
    }
    
    $stmt = $db->prepare("
        SELECT 
            id,
            email,
            full_name,
            phone,
            address,
            role,
            email_verified,
            is_active,
            created_at,
            last_login
        FROM users
        $whereClause
        ORDER BY created_at DESC
    ");
    
    $stmt->execute($params);
    $users = $stmt->fetchAll();
    
    Response::success($users, 'Kullanıcılar başarıyla getirildi');
    
} catch (PDOException $e) {
    error_log("List All Users Error: " . $e->getMessage());
    Response::error('Kullanıcılar getirilirken bir hata oluştu', 500);
}
