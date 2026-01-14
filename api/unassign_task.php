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
    'complaint_id' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$complaintId = (int)$input['complaint_id'];

try {
    $complaintStmt = $db->prepare("SELECT id, status, assigned_to FROM complaints WHERE id = :id");
    $complaintStmt->execute(['id' => $complaintId]);
    $complaint = $complaintStmt->fetch();
    
    if (!$complaint) {
        Response::error('Şikayet bulunamadı', 404);
    }
    
    // If not assigned, nothing to do
    if (!$complaint['assigned_to']) {
        Response::error('Bu şikayet zaten atanmamış', 400);
    }
    
    $oldAssignedTo = $complaint['assigned_to'];
    
    $updateStmt = $db->prepare("
        UPDATE complaints 
        SET assigned_to = NULL, 
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");
    $updateStmt->execute([
        'id' => $complaintId
    ]);
    
    $stmt = $db->prepare("SELECT * FROM complaints WHERE id = :id");
    $stmt->execute(['id' => $complaintId]);
    $updatedComplaint = $stmt->fetch();
    
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (complaint_id, user_id, action, old_value, new_value, description)
        VALUES (:complaint_id, :user_id, 'unassigned', :old_value, NULL, :description)
    ");
    $logStmt->execute([
        'complaint_id' => $complaintId,
        'user_id' => $user['id'],
        'old_value' => (string)$oldAssignedTo,
        'description' => "Şikayetin görev ataması kaldırıldı"
    ]);
    
    // Notify the user who was unassigned? Maybe.
    $notificationStmt = $db->prepare("
        INSERT INTO notifications (user_id, complaint_id, title, message, type)
        VALUES (:user_id, :complaint_id, :title, :message, 'info')
    ");
    $notificationStmt->execute([
        'user_id' => $oldAssignedTo,
        'complaint_id' => $complaintId,
        'title' => 'Görev Ataması Kaldırıldı',
        'message' => "Şu şikayet üzerindeki göreviniz kaldırıldı: {$updatedComplaint['title']}"
    ]);
    
    Response::success($updatedComplaint, 'Görev ataması başarıyla kaldırıldı');
    
} catch (PDOException $e) {
    error_log("Unassign Task Error: " . $e->getMessage());
    Response::error('Görev ataması kaldırılırken bir hata oluştu', 500);
}
