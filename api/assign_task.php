<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Validator.php';

$auth = new Auth();
$db = Database::getInstance()->getConnection();

$user = $auth->requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$validation = Validator::validate($input, [
    'complaint_id' => 'required',
    'assigned_to' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$complaintId = (int)$input['complaint_id'];
$assignedTo = (int)$input['assigned_to'];

try {
    $complaintStmt = $db->prepare("SELECT id, status, assigned_to FROM complaints WHERE id = :id");
    $complaintStmt->execute(['id' => $complaintId]);
    $complaint = $complaintStmt->fetch();
    
    if (!$complaint) {
        Response::error('Şikayet bulunamadı', 404);
    }
    
    $userStmt = $db->prepare("SELECT id, role FROM users WHERE id = :id AND role IN ('staff', 'admin')");
    $userStmt->execute(['id' => $assignedTo]);
    $assignedUser = $userStmt->fetch();
    
    if (!$assignedUser) {
        Response::error('Geçersiz kullanıcı veya yetki', 400);
    }
    
    $oldStatus = $complaint['status'];
    $oldAssignedTo = $complaint['assigned_to'];
    
    $updateStmt = $db->prepare("
        UPDATE complaints 
        SET assigned_to = :assigned_to, 
            assigned_at = CURRENT_TIMESTAMP,
            status = CASE 
                WHEN status = 'pending' THEN 'assigned'
                ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");
    $updateStmt->execute([
        'assigned_to' => $assignedTo,
        'id' => $complaintId
    ]);
    
    $stmt = $db->prepare("SELECT * FROM complaints WHERE id = :id");
    $stmt->execute(['id' => $complaintId]);
    $updatedComplaint = $stmt->fetch();
    
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (complaint_id, user_id, action, old_value, new_value, description)
        VALUES (:complaint_id, :user_id, 'assigned', :old_value, :new_value, :description)
    ");
    $logStmt->execute([
        'complaint_id' => $complaintId,
        'user_id' => $user['id'],
        'old_value' => $oldAssignedTo ? (string)$oldAssignedTo : null,
        'new_value' => (string)$assignedTo,
        'description' => "Şikayet {$assignedUser['role']} kullanıcısına atandı"
    ]);
    
    $notificationStmt = $db->prepare("
        INSERT INTO notifications (user_id, complaint_id, title, message, type)
        VALUES (:user_id, :complaint_id, :title, :message, 'info')
    ");
    $notificationStmt->execute([
        'user_id' => $assignedTo,
        'complaint_id' => $complaintId,
        'title' => 'Yeni Görev Atandı',
        'message' => "Size yeni bir şikayet atandı: {$updatedComplaint['title']}"
    ]);
    
    Response::success($updatedComplaint, 'Şikayet başarıyla atandı');
    
} catch (PDOException $e) {
    error_log("Assign Task Error: " . $e->getMessage());
    Response::error('Görev atanırken bir hata oluştu', 500);
}

