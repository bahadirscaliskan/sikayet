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

if (!isset($_GET['id']) || empty($_GET['id'])) {
    Response::error('Şikayet ID gerekli', 400);
}

$complaintId = (int)$_GET['id'];

try {
    $stmt = $db->prepare("
        SELECT 
            c.*,
            u.full_name as user_name,
            u.email as user_email,
            a.full_name as assigned_to_name,
            a.email as assigned_to_email
        FROM complaints c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN users a ON c.assigned_to = a.id
        WHERE c.id = :id
    ");
    $stmt->execute(['id' => $complaintId]);
    $complaint = $stmt->fetch();
    
    if (!$complaint) {
        Response::error('Şikayet bulunamadı', 404);
    }
    
    if ($user['role'] === 'citizen' && $complaint['user_id'] != $user['id']) {
        Response::error('Bu şikayeti görüntüleme yetkiniz yok', 403);
    }
    
    if ($user['role'] === 'staff' && $complaint['assigned_to'] != $user['id']) {
        Response::error('Bu şikayeti görüntüleme yetkiniz yok', 403);
    }
    
    $photoStmt = $db->prepare("
        SELECT id, photo_path, photo_type, created_at
        FROM complaint_photos
        WHERE complaint_id = :complaint_id
        ORDER BY created_at ASC
    ");
    $photoStmt->execute(['complaint_id' => $complaintId]);
    $complaint['photos'] = $photoStmt->fetchAll();
    
    // Yorumları çek - vatandaşlar için sadece internal olmayan yorumlar, yetkililer için tüm yorumlar
    if ($user['role'] === 'citizen') {
        // Vatandaş kullanıcıları için sadece public (internal olmayan) yorumlar
        $commentStmt = $db->prepare("
            SELECT 
                co.id,
                co.user_id,
                co.comment_text,
                co.is_internal,
                co.created_at,
                u.full_name as user_name,
                u.role as user_role
            FROM comments co
            LEFT JOIN users u ON co.user_id = u.id
            WHERE co.complaint_id = :complaint_id
            AND (co.is_internal = false OR co.is_internal IS NULL)
            ORDER BY co.created_at ASC
        ");
        $commentStmt->execute([
            'complaint_id' => $complaintId
        ]);
    } else {
        // Admin ve staff için tüm yorumlar (hem internal hem public)
        $commentStmt = $db->prepare("
            SELECT 
                co.id,
                co.user_id,
                co.comment_text,
                co.is_internal,
                co.created_at,
                u.full_name as user_name,
                u.role as user_role
            FROM comments co
            LEFT JOIN users u ON co.user_id = u.id
            WHERE co.complaint_id = :complaint_id
            ORDER BY co.created_at ASC
        ");
        $commentStmt->execute([
            'complaint_id' => $complaintId
        ]);
    }
    $complaint['comments'] = $commentStmt->fetchAll();
    
    $logStmt = $db->prepare("
        SELECT 
            al.*,
            u.full_name as user_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.complaint_id = :complaint_id
        ORDER BY al.created_at DESC
    ");
    $logStmt->execute(['complaint_id' => $complaintId]);
    $complaint['activity_logs'] = $logStmt->fetchAll();
    
    Response::success($complaint, 'Şikayet detayı başarıyla getirildi');
    
} catch (PDOException $e) {
    error_log("Get Complaint Error: " . $e->getMessage());
    Response::error('Şikayet getirilirken bir hata oluştu', 500);
}

