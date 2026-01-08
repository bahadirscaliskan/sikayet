<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Validator.php';

$auth = new Auth();
$db = Database::getInstance()->getConnection();

$user = $auth->requireAuth();

// Sadece admin silebilir
if ($user['role'] !== 'admin') {
    Response::error('Bu işlem için yetkiniz yok', 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);

$validation = Validator::validate($input, [
    'user_id' => 'required|numeric'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$userIdToDelete = $input['user_id'];

// Kendini silmeyi engelle
if ($userIdToDelete == $user['id']) {
    Response::error('Kendinizi silemezsiniz', 400);
}

try {
    // Kullanıcıyı sil (Cascade ile ilişkili veriler de silinebilir veya soft delete yapılabilir)
    // Şimdilik sert silme yapıyoruz, ilişkili veriler veritabanı constraint'lerine bağlı
    
    $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
    $stmt->execute(['id' => $userIdToDelete]);
    
    if ($stmt->rowCount() > 0) {
        Response::success(null, 'Kullanıcı başarıyla silindi');
    } else {
        Response::error('Kullanıcı bulunamadı', 404);
    }
    
} catch (PDOException $e) {
    // Constraint hatası kontrolü (örneğin şikayetleri varsa silinemeyebilir)
    if ($e->getCode() == '23000' || $e->getCode() == '23503') { 
         Response::error('Bu kullanıcıya ait kayıtlar olduğu için silinemiyor.', 400);
    }
    error_log("Delete User Error: " . $e->getMessage());
    Response::error('Kullanıcı silinirken bir hata oluştu', 500);
}
