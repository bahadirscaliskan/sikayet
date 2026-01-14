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

// is_internal değeri hem JSON boolean, hem string ("true"/"false") hem de 0/1 olarak gelebileceği için
// hepsini güvenli bir şekilde booleana çeviriyoruz.
$rawIsInternal = $input['is_internal'] ?? false;

// PostgreSQL boolean için güvenli dönüşüm
if (is_bool($rawIsInternal)) {
    $isInternal = $rawIsInternal;
} elseif (is_string($rawIsInternal)) {
    $rawIsInternal = trim(strtolower($rawIsInternal));
    $isInternal = in_array($rawIsInternal, ['1', 'true', 'on', 'yes'], true);
} elseif (is_numeric($rawIsInternal)) {
    $isInternal = (bool)(int)$rawIsInternal;
} else {
    $isInternal = false;
}

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
    ");
    
    // PostgreSQL boolean için PDO::PARAM_BOOL kullan
    $stmt->bindValue(':complaint_id', $complaintId, PDO::PARAM_INT);
    $stmt->bindValue(':user_id', $user['id'], PDO::PARAM_INT);
    $stmt->bindValue(':comment_text', $commentText, PDO::PARAM_STR);
    $stmt->bindValue(':is_internal', $isInternal, PDO::PARAM_BOOL);
    $stmt->execute();
    
    $id = $db->lastInsertId();
    $stmt = $db->prepare("SELECT id, complaint_id, user_id, comment_text, is_internal, created_at FROM comments WHERE id = :id");
    $stmt->execute(['id' => $id]);
    $comment = $stmt->fetch();
    if (!$comment) {
        Response::error('Yorum oluşturulamadı', 500);
    }
    
    // Kullanıcı bilgilerini al (Auth::checkAuth() 'name' döndürüyor, 'full_name' değil)
    $userStmt = $db->prepare("SELECT full_name, role FROM users WHERE id = :id");
    $userStmt->execute(['id' => $user['id']]);
    $userInfo = $userStmt->fetch();
    
    // user_name için önce veritabanından gelen full_name'i kullan, yoksa session'daki name'i kullan
    $comment['user_name'] = $userInfo['full_name'] ?? $user['name'] ?? 'Kullanıcı';
    $comment['user_role'] = $userInfo['role'] ?? $user['role'] ?? 'unknown';
    
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
    error_log("Add Comment Error Trace: " . $e->getTraceAsString());
    Response::error('Yorum eklenirken bir hata oluştu: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    error_log("Add Comment General Error: " . $e->getMessage());
    Response::error('Yorum eklenirken bir hata oluştu: ' . $e->getMessage(), 500);
}

