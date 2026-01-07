<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Validator.php';

$auth = new Auth();
$db = Database::getInstance()->getConnection();

$user = $auth->requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$validation = Validator::validate($input, [
    'complaint_id' => 'required',
    'comment_text' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$complaintId = (int)$input['complaint_id'];
$commentText = trim($input['comment_text']);
$isInternal = isset($input['is_internal']) && $input['is_internal'] === true;

if ($isInternal && !in_array($user['role'], ['admin', 'staff'])) {
    Response::error('Internal yorum yapma yetkiniz yok', 403);
}

try {
    $complaintStmt = $db->prepare("SELECT id, user_id, assigned_to FROM complaints WHERE id = :id");
    $complaintStmt->execute(['id' => $complaintId]);
    $complaint = $complaintStmt->fetch();
    
    if (!$complaint) {
        Response::error('Şikayet bulunamadı', 404);
    }
    
    if ($user['role'] === 'citizen' && $complaint['user_id'] != $user['id']) {
        Response::error('Bu şikayete yorum yapma yetkiniz yok', 403);
    }
    
    $stmt = $db->prepare("
        INSERT INTO comments (complaint_id, user_id, comment_text, is_internal)
        VALUES (:complaint_id, :user_id, :comment_text, :is_internal)
        RETURNING id, complaint_id, user_id, comment_text, is_internal, created_at
    ");
    
    $stmt->execute([
        'complaint_id' => $complaintId,
        'user_id' => $user['id'],
        'comment_text' => $commentText,
        'is_internal' => $isInternal
    ]);
    
    $comment = $stmt->fetch();
    $comment['user_name'] = $user['name'];
    $comment['user_role'] = $user['role'];
    
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (complaint_id, user_id, action, description)
        VALUES (:complaint_id, :user_id, 'commented', :description)
    ");
    $logStmt->execute([
        'complaint_id' => $complaintId,
        'user_id' => $user['id'],
        'description' => $isInternal ? 'Internal yorum eklendi' : 'Yorum eklendi'
    ]);
    
    $notificationUsers = [];
    if ($complaint['user_id'] != $user['id']) {
        $notificationUsers[] = $complaint['user_id'];
    }
    if ($complaint['assigned_to'] && $complaint['assigned_to'] != $user['id']) {
        $notificationUsers[] = $complaint['assigned_to'];
    }
    
    foreach ($notificationUsers as $notifyUserId) {
        $notificationStmt = $db->prepare("
            INSERT INTO notifications (user_id, complaint_id, title, message, type)
            VALUES (:user_id, :complaint_id, :title, :message, 'info')
        ");
        $notificationStmt->execute([
            'user_id' => $notifyUserId,
            'complaint_id' => $complaintId,
            'title' => 'Yeni Yorum',
            'message' => "Şikayetinize yeni bir yorum eklendi"
        ]);
    }
    
    Response::success($comment, 'Yorum başarıyla eklendi', 201);
    
} catch (PDOException $e) {
    error_log("Add Comment Error: " . $e->getMessage());
    Response::error('Yorum eklenirken bir hata oluştu', 500);
}

