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
    $whereClause = "";
    $params = [];
    
    if ($user['role'] === 'citizen') {
        $whereClause = "WHERE c.user_id = :user_id";
        $params['user_id'] = $user['id'];
    } elseif ($user['role'] === 'staff') {
        $whereClause = "WHERE c.assigned_to = :user_id";
        $params['user_id'] = $user['id'];
    }
    
    if (isset($_GET['status']) && !empty($_GET['status'])) {
        $whereClause .= ($whereClause ? " AND " : "WHERE ") . "c.status = :status";
        $params['status'] = $_GET['status'];
    }
    
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $offset = ($page - 1) * $limit;
    
    $countStmt = $db->prepare("SELECT COUNT(*) as total FROM complaints c $whereClause");
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];
    
    $params['limit'] = $limit;
    $params['offset'] = $offset;
    
    $stmt = $db->prepare("
        SELECT 
            c.id,
            c.title,
            c.description,
            c.latitude,
            c.longitude,
            c.address,
            c.status,
            c.priority,
            c.created_at,
            c.updated_at,
            c.assigned_at,
            c.completed_at,
            u.full_name as user_name,
            u.email as user_email,
            a.full_name as assigned_to_name,
            a.email as assigned_to_email
        FROM complaints c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN users a ON c.assigned_to = a.id
        $whereClause
        ORDER BY c.created_at DESC
        LIMIT :limit OFFSET :offset
    ");
    
    foreach ($params as $key => $value) {
        $paramType = ($key === 'limit' || $key === 'offset') ? PDO::PARAM_INT : PDO::PARAM_STR;
        $stmt->bindValue(':' . $key, $value, $paramType);
    }
    $stmt->execute();
    
    $complaints = $stmt->fetchAll();
    
    foreach ($complaints as &$complaint) {
        $photoStmt = $db->prepare("
            SELECT id, photo_path, photo_type, created_at
            FROM complaint_photos
            WHERE complaint_id = :complaint_id
            ORDER BY created_at ASC
        ");
        $photoStmt->execute(['complaint_id' => $complaint['id']]);
        $complaint['photos'] = $photoStmt->fetchAll();
    }
    
    Response::success([
        'complaints' => $complaints,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'total_pages' => ceil($total / $limit)
        ]
    ], 'Şikayetler başarıyla getirildi');
    
} catch (PDOException $e) {
    error_log("List Complaints Error: " . $e->getMessage());
    Response::error('Şikayetler getirilirken bir hata oluştu', 500);
}

