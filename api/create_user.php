<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Validator.php';

$auth = new Auth();
$db = Database::getInstance()->getConnection();

// Sadece admin yetkisi gerekli
$admin = $auth->requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$validation = Validator::validate($input, [
    'email' => 'required|email',
    'password' => 'required|password',
    'full_name' => 'required',
    'role' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$allowedRoles = ['citizen', 'staff', 'admin'];
if (!in_array($input['role'], $allowedRoles)) {
    Response::error('Geçersiz rol', 400);
}

try {
    // E-posta kontrolü
    $checkStmt = $db->prepare("SELECT id FROM users WHERE email = :email");
    $checkStmt->execute(['email' => $input['email']]);
    if ($checkStmt->fetch()) {
        Response::error('Bu e-posta adresi zaten kullanılıyor', 400);
    }
    
    // Şifre hash'leme
    $passwordHash = password_hash($input['password'], PASSWORD_DEFAULT);
    
    $stmt = $db->prepare("
        INSERT INTO users (email, password_hash, full_name, phone, role, email_verified, is_active)
        VALUES (:email, :password_hash, :full_name, :phone, :role, :email_verified, :is_active)
        RETURNING id, email, full_name, phone, role, created_at
    ");
    
    $stmt->execute([
        'email' => $input['email'],
        'password_hash' => $passwordHash,
        'full_name' => $input['full_name'],
        'phone' => $input['phone'] ?? null,
        'role' => $input['role'],
        'email_verified' => isset($input['email_verified']) ? $input['email_verified'] : true,
        'is_active' => isset($input['is_active']) ? $input['is_active'] : true
    ]);
    
    $newUser = $stmt->fetch();
    
    // Aktivite logu
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (user_id, action, description)
        VALUES (:user_id, 'user_created', :description)
    ");
    $logStmt->execute([
        'user_id' => $admin['id'],
        'description' => "Yeni kullanıcı oluşturuldu: {$newUser['email']} ({$newUser['role']})"
    ]);
    
    Response::success($newUser, 'Kullanıcı başarıyla oluşturuldu', 201);
    
} catch (PDOException $e) {
    error_log("Create User Error: " . $e->getMessage());
    Response::error('Kullanıcı oluşturulurken bir hata oluştu', 500);
}

