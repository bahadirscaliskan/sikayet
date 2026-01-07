<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

$auth = new Auth();
$db = Database::getInstance()->getConnection();

$user = $auth->requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Sadece GET istekleri kabul edilir', 405);
}

try {
    $stmt = $db->prepare("
        SELECT 
            u.id,
            u.email,
            u.full_name,
            u.phone,
            u.role,
            u.created_at,
            u.last_login,
            COUNT(DISTINCT c.id) as total_complaints,
            COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_complaints,
            COUNT(DISTINCT CASE WHEN c.status IN ('assigned', 'in_progress') THEN c.id END) as active_complaints
        FROM users u
        LEFT JOIN complaints c ON c.assigned_to = u.id
        WHERE u.role IN ('staff', 'admin')
        GROUP BY u.id, u.email, u.full_name, u.phone, u.role, u.created_at, u.last_login
        ORDER BY u.full_name ASC
    ");
    $stmt->execute();
    
    $staff = $stmt->fetchAll();
    
    Response::success($staff, 'Personel listesi başarıyla getirildi');
    
} catch (PDOException $e) {
    error_log("List Staff Error: " . $e->getMessage());
    Response::error('Personel listesi getirilirken bir hata oluştu', 500);
}

