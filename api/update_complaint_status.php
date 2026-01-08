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
    'status' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$allowedStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'rejected', 'closed'];
if (!in_array($input['status'], $allowedStatuses)) {
    Response::error('Geçersiz durum', 400);
}

$complaintId = (int)$input['complaint_id'];
$newStatus = $input['status'];

try {
    $complaintStmt = $db->prepare("SELECT id, status, user_id, assigned_to FROM complaints WHERE id = :id");
    $complaintStmt->execute(['id' => $complaintId]);
    $complaint = $complaintStmt->fetch();
    
    if (!$complaint) {
        Response::error('Şikayet bulunamadı', 404);
    }
    
    if ($user['role'] === 'citizen' && $complaint['user_id'] != $user['id']) {
        Response::error('Bu işlem için yetkiniz yok', 403);
    }
    
    if ($user['role'] === 'staff' && $complaint['assigned_to'] != $user['id']) {
        Response::error('Bu işlem için yetkiniz yok', 403);
    }
    
    $oldStatus = $complaint['status'];
    
    $updateData = [
        'status' => $newStatus,
        'id' => $complaintId
    ];
    
    $updateQuery = "UPDATE complaints SET status = :status";
    
    if (isset($input['priority']) && in_array($input['priority'], ['low', 'medium', 'high', 'urgent'])) {
        $updateQuery .= ", priority = :priority";
        $updateData['priority'] = $input['priority'];
    }
    
    $updateQuery .= ", updated_at = CURRENT_TIMESTAMP";
    
    if ($newStatus === 'completed') {
        $updateQuery .= ", completed_at = CURRENT_TIMESTAMP";
    }
    
    $updateQuery .= " WHERE id = :id RETURNING *";
    
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->execute($updateData);
    
    $updatedComplaint = $updateStmt->fetch();
    
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (complaint_id, user_id, action, old_value, new_value, description)
        VALUES (:complaint_id, :user_id, 'status_changed', :old_value, :new_value, :description)
    ");
    $logStmt->execute([
        'complaint_id' => $complaintId,
        'user_id' => $user['id'],
        'old_value' => $oldStatus,
        'new_value' => $newStatus,
        'description' => "Durum '{$oldStatus}' -> '{$newStatus}' olarak değiştirildi"
    ]);
    
    if ($complaint['user_id'] != $user['id']) {
        $notificationStmt = $db->prepare("
            INSERT INTO notifications (user_id, complaint_id, title, message, type)
            VALUES (:user_id, :complaint_id, :title, :message, :type)
        ");
        
        $statusMessages = [
            'completed' => 'Şikayetiniz tamamlandı',
            'in_progress' => 'Şikayetiniz işleme alındı',
            'rejected' => 'Şikayetiniz reddedildi',
            'closed' => 'Şikayetiniz kapatıldı'
        ];
        
        $message = $statusMessages[$newStatus] ?? "Şikayetinizin durumu güncellendi: {$newStatus}";
        $type = ($newStatus === 'completed') ? 'success' : 'info';
        
        $notificationStmt->execute([
            'user_id' => $complaint['user_id'],
            'complaint_id' => $complaintId,
            'title' => 'Şikayet Durumu Güncellendi',
            'message' => $message,
            'type' => $type
        ]);
    }
    
    Response::success($updatedComplaint, 'Şikayet durumu başarıyla güncellendi');
    
} catch (PDOException $e) {
    error_log("Update Complaint Status Error: " . $e->getMessage());
    Response::error('Durum güncellenirken bir hata oluştu', 500);
}

