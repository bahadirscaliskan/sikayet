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
    'comment_id' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$commentId = (int)$input['comment_id'];

try {
    // Yorumu kontrol et
    $commentStmt = $db->prepare("
        SELECT co.id, co.user_id, co.complaint_id, c.user_id as complaint_user_id, c.status
        FROM comments co
        JOIN complaints c ON co.complaint_id = c.id
        WHERE co.id = :id
    ");
    $commentStmt->execute(['id' => $commentId]);
    $comment = $commentStmt->fetch();
    
    if (!$comment) {
        Response::error('Yorum bulunamadı', 404);
    }
    
    // Sadece yorum sahibi veya şikayet sahibi silebilir (sadece pending/assigned durumlarında)
    $canDelete = false;
    
    if ($comment['user_id'] == $user['id']) {
        // Yorum sahibi silebilir
        $canDelete = true;
    } elseif ($comment['complaint_user_id'] == $user['id'] && in_array($comment['status'], ['pending', 'assigned'])) {
        // Şikayet sahibi silebilir (sadece işleme alınmadan önce)
        $canDelete = true;
    }
    
    if (!$canDelete) {
        Response::error('Bu yorumu silme yetkiniz yok', 403);
    }
    
    // Yorumu sil
    $deleteStmt = $db->prepare("DELETE FROM comments WHERE id = :id RETURNING id");
    $deleteStmt->execute(['id' => $commentId]);
    $deletedComment = $deleteStmt->fetch();
    
    if (!$deletedComment) {
        Response::error('Yorum silinemedi', 500);
    }
    
    // Activity log ekle
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (complaint_id, user_id, action, description)
        VALUES (:complaint_id, :user_id, 'comment_deleted', 'Yorum silindi')
    ");
    $logStmt->execute([
        'complaint_id' => $comment['complaint_id'],
        'user_id' => $user['id']
    ]);
    
    Response::success(['comment_id' => $commentId], 'Yorum başarıyla silindi');
    
} catch (PDOException $e) {
    error_log("Delete Comment Error: " . $e->getMessage());
    Response::error('Yorum silinirken bir hata oluştu: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    error_log("Delete Comment General Error: " . $e->getMessage());
    Response::error('Yorum silinirken bir hata oluştu: ' . $e->getMessage(), 500);
}


