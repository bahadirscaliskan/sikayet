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
    if (isset($_POST['id'])) {
        $input = ['id' => $_POST['id']];
    } else {
        $input = []; 
    }
}

if (!isset($input['id'])) {
    Response::error('Şikayet ID gereklidir', 400);
}

$complaintId = (int)$input['id'];

try {
    $stmt = $db->prepare("SELECT id, user_id, status FROM complaints WHERE id = :id");
    $stmt->execute(['id' => $complaintId]);
    $complaint = $stmt->fetch();

    if (!$complaint) {
        Response::error('Şikayet bulunamadı', 404);
    }

    // Yetki kontrolü
    if ($user['role'] !== 'admin' && $complaint['user_id'] != $user['id']) {
        Response::error('Bu işlem için yetkiniz yok', 403);
    }

    // Soft Delete işlemi (Status update -> closed)
    // DB constraint nedeniyle 'deleted' kullanamıyoruz, 'closed' kullanıp listede gizleyeceğiz.
    $updateStmt = $db->prepare("UPDATE complaints SET status = 'closed' WHERE id = :id");
    $updateStmt->execute(['id' => $complaintId]);

    // Loglama
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (complaint_id, user_id, action, description)
        VALUES (:complaint_id, :user_id, 'deleted', 'Şikayet silindi (Soft Delete - Closed)')
    ");
    $logStmt->execute([
        'complaint_id' => $complaintId,
        'user_id' => $user['id']
    ]);

    Response::success(null, 'Şikayet başarıyla silindi');

} catch (PDOException $e) {
    error_log("Delete Complaint Error: " . $e->getMessage());
    Response::error('Şikayet silinirken bir hata oluştu', 500);
}
