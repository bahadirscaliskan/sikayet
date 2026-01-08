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
    'title' => 'required',
    'description' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

if (isset($input['latitude']) && !Validator::latitude($input['latitude'])) {
    Response::error('Geçersiz enlem değeri', 400);
}

if (isset($input['longitude']) && !Validator::longitude($input['longitude'])) {
    Response::error('Geçersiz boylam değeri', 400);
}

try {
    $stmt = $db->prepare("
        INSERT INTO complaints (user_id, title, description, latitude, longitude, address, priority)
        VALUES (:user_id, :title, :description, :latitude, :longitude, :address, :priority)
        RETURNING id, title, description, latitude, longitude, address, status, created_at
    ");
    
    $stmt->execute([
        'user_id' => $user['id'],
        'title' => $input['title'],
        'description' => $input['description'],
        'latitude' => $input['latitude'] ?? null,
        'longitude' => $input['longitude'] ?? null,
        'address' => $input['address'] ?? null,
        'priority' => $input['priority'] ?? null
    ]);
    
    $complaint = $stmt->fetch();
    
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (complaint_id, user_id, action, description)
        VALUES (:complaint_id, :user_id, 'created', 'Şikayet oluşturuldu')
    ");
    $logStmt->execute([
        'complaint_id' => $complaint['id'],
        'user_id' => $user['id']
    ]);
    
    if (isset($_FILES['photos']) && !empty($_FILES['photos']['name'][0])) {
        $photoIds = [];
        foreach ($_FILES['photos']['name'] as $key => $name) {
            if ($_FILES['photos']['error'][$key] === UPLOAD_ERR_OK) {
                $tmpName = $_FILES['photos']['tmp_name'][$key];
                $fileSize = $_FILES['photos']['size'][$key];
                $fileType = $_FILES['photos']['type'][$key];
                
                if (!in_array($fileType, ALLOWED_IMAGE_TYPES)) {
                    continue;
                }
                
                if ($fileSize > MAX_FILE_SIZE) {
                    continue;
                }
                
                $extension = pathinfo($name, PATHINFO_EXTENSION);
                $fileName = uniqid('complaint_') . '_' . time() . '.' . $extension;
                $uploadPath = UPLOAD_DIR . 'complaints/' . $fileName;
                
                if (move_uploaded_file($tmpName, $uploadPath)) {
                    $photoStmt = $db->prepare("
                        INSERT INTO complaint_photos (complaint_id, photo_path, photo_type, uploaded_by)
                        VALUES (:complaint_id, :photo_path, 'before', :uploaded_by)
                        RETURNING id
                    ");
                    $photoStmt->execute([
                        'complaint_id' => $complaint['id'],
                        'photo_path' => 'complaints/' . $fileName,
                        'uploaded_by' => $user['id']
                    ]);
                    $photoIds[] = $photoStmt->fetch()['id'];
                }
            }
        }
        $complaint['photos'] = $photoIds;
    }
    
    Response::success($complaint, 'Şikayet başarıyla oluşturuldu', 201);
    
} catch (PDOException $e) {
    error_log("Create Complaint Error: " . $e->getMessage());
    Response::error('Şikayet oluşturulurken bir hata oluştu', 500);
}

