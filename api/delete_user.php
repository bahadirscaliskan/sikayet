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
    // Soft delete: Kullanıcıyı silmek yerine is_active'i false yap
    // Bu sayede ilişkili veriler korunur ve gerekirse geri yüklenebilir
    
    $stmt = $db->prepare("UPDATE users SET is_active = false WHERE id = :id AND is_active = true");
    $stmt->execute(['id' => $userIdToDelete]);
    
    if ($stmt->rowCount() > 0) {
        Response::success(null, 'Kullanıcı başarıyla pasif hale getirildi');
    } else {
        Response::error('Kullanıcı bulunamadı veya zaten pasif durumda', 404);
    }
    
} catch (PDOException $e) {
    error_log("Delete User Error: " . $e->getMessage());
    Response::error('Kullanıcı işlemi sırasında bir hata oluştu', 500);
}
