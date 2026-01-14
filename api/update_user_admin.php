<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Validator.php';

$auth = new Auth();
$db = Database::getInstance()->getConnection();

$user = $auth->requireAuth();

// Sadece admin düzenleyebilir
if ($user['role'] !== 'admin') {
    Response::error('Bu işlem için yetkiniz yok', 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);

$validation = Validator::validate($input, [
    'user_id' => 'required|numeric',
    'full_name' => 'required',
    'role' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

try {
    $updateData = [
        'id' => $input['user_id'],
        'full_name' => $input['full_name'],
        'phone' => $input['phone'] ?? null,
        'address' => $input['address'] ?? null,
        'role' => $input['role']
    ];
    
    $updateQuery = "UPDATE users SET full_name = :full_name, phone = :phone, address = :address, role = :role";
    
    // Şifre değiştiriliyorsa
    if (!empty($input['password'])) {
        if (strlen($input['password']) < 6) {
            Response::error('Şifre en az 6 karakter olmalıdır', 400);
        }
        $updateQuery .= ", password_hash = :password_hash";
        $updateData['password_hash'] = password_hash($input['password'], PASSWORD_DEFAULT);
    }
    
    $updateQuery .= ", updated_at = CURRENT_TIMESTAMP WHERE id = :id";
    
    $stmt = $db->prepare($updateQuery);
    $stmt->execute($updateData);
    
    $fetchStmt = $db->prepare("SELECT id, email, full_name, phone, role, is_active, created_at FROM users WHERE id = :id");
    $fetchStmt->execute(['id' => $input['user_id']]);
    $updatedUser = $fetchStmt->fetch();

    if ($updatedUser) {
         Response::success($updatedUser, 'Kullanıcı başarıyla güncellendi');
    } else {
        // Row count 0 olabilir eğer veri değişmediyse
        // ID kontrolü yapalım
        $check = $db->prepare("SELECT id FROM users WHERE id = :id");
        $check->execute(['id' => $input['user_id']]);
        if ($check->rowCount() === 0) {
             Response::error('Kullanıcı bulunamadı', 404);
        }
        Response::success(null, 'Kullanıcı başarıyla güncellendi (Değişiklik yok)');
    }
    
} catch (PDOException $e) {
    error_log("Update User Error: " . $e->getMessage());
    Response::error('Kullanıcı güncellenirken bir hata oluştu', 500);
}
