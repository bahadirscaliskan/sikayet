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
    'full_name' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

try {
    $updateData = [
        'full_name' => $input['full_name'],
        'phone' => $input['phone'] ?? null,
        'address' => $input['address'] ?? null,
        'id' => $user['id']
    ];
    
    $updateQuery = "UPDATE users SET full_name = :full_name, phone = :phone, address = :address";
    
    // Şifre değiştiriliyorsa
    if (!empty($input['password'])) {
        if (strlen($input['password']) < 6) {
            Response::error('Şifre en az 6 karakter olmalıdır', 400);
        }
        $updateQuery .= ", password_hash = :password_hash";
        $updateData['password_hash'] = password_hash($input['password'], PASSWORD_DEFAULT);
    }
    
    $updateQuery .= ", updated_at = CURRENT_TIMESTAMP WHERE id = :id RETURNING id, email, full_name, phone, role";
    
    $stmt = $db->prepare($updateQuery);
    $stmt->execute($updateData);
    
    $updatedUser = $stmt->fetch();
    
    // Session'ı güncelle
    $_SESSION['user_name'] = $updatedUser['full_name'];
    
    Response::success($updatedUser, 'Profil başarıyla güncellendi');
    
} catch (PDOException $e) {
    error_log("Update Profile Error: " . $e->getMessage());
    Response::error('Profil güncellenirken bir hata oluştu', 500);
}

