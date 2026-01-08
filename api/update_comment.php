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
    'comment_id' => 'required',
    'comment_text' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$commentId = (int)$input['comment_id'];
$commentText = trim($input['comment_text']);

try {
    // Yorumu kontrol et
    $commentStmt = $db->prepare("
        SELECT co.id, co.user_id, co.complaint_id, co.is_internal, c.status
        FROM comments co
        JOIN complaints c ON co.complaint_id = c.id
        WHERE co.id = :id
    ");
    $commentStmt->execute(['id' => $commentId]);
    $comment = $commentStmt->fetch();
    
    if (!$comment) {
        Response::error('Yorum bulunamadı', 404);
    }
    
    // Sadece yorum sahibi düzenleyebilir
    if ($comment['user_id'] != $user['id']) {
        Response::error('Bu yorumu düzenleme yetkiniz yok', 403);
    }
    
    // Yorumu güncelle
    $updateStmt = $db->prepare("
        UPDATE comments 
        SET comment_text = :comment_text
        WHERE id = :id
        RETURNING id, complaint_id, user_id, comment_text, is_internal, created_at
    ");
    
    $updateStmt->execute([
        'id' => $commentId,
        'comment_text' => $commentText
    ]);
    
    $updatedComment = $updateStmt->fetch();
    
    if (!$updatedComment) {
        Response::error('Yorum güncellenemedi', 500);
    }
    
    // Kullanıcı bilgilerini al
    $userStmt = $db->prepare("SELECT full_name, role FROM users WHERE id = :id");
    $userStmt->execute(['id' => $user['id']]);
    $userInfo = $userStmt->fetch();
    
    $updatedComment['user_name'] = $userInfo['full_name'] ?? $user['name'] ?? 'Kullanıcı';
    $updatedComment['user_role'] = $userInfo['role'] ?? $user['role'] ?? 'unknown';
    
    // Activity log ekle
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (complaint_id, user_id, action, description)
        VALUES (:complaint_id, :user_id, 'comment_updated', 'Yorum düzenlendi')
    ");
    $logStmt->execute([
        'complaint_id' => $comment['complaint_id'],
        'user_id' => $user['id']
    ]);
    
    Response::success($updatedComment, 'Yorum başarıyla güncellendi');
    
} catch (PDOException $e) {
    error_log("Update Comment Error: " . $e->getMessage());
    Response::error('Yorum güncellenirken bir hata oluştu: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    error_log("Update Comment General Error: " . $e->getMessage());
    Response::error('Yorum güncellenirken bir hata oluştu: ' . $e->getMessage(), 500);
}


