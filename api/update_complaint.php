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
    'title' => 'required',
    'description' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$complaintId = (int)$input['complaint_id'];
$title = trim($input['title']);
$description = trim($input['description']);
$address = isset($input['address']) ? trim($input['address']) : null;
$latitude = isset($input['latitude']) ? $input['latitude'] : null;
$longitude = isset($input['longitude']) ? $input['longitude'] : null;

try {
    // Şikayeti kontrol et
    $complaintStmt = $db->prepare("SELECT id, user_id, status FROM complaints WHERE id = :id");
    $complaintStmt->execute(['id' => $complaintId]);
    $complaint = $complaintStmt->fetch();
    
    if (!$complaint) {
        Response::error('Şikayet bulunamadı', 404);
    }
    
    // Sadece şikayet sahibi düzenleyebilir
    if ($complaint['user_id'] != $user['id']) {
        Response::error('Bu şikayeti düzenleme yetkiniz yok', 403);
    }
    
    // Sadece pending veya assigned durumlarında düzenlenebilir
    if (!in_array($complaint['status'], ['pending', 'assigned'])) {
        Response::error('Bu şikayet artık düzenlenemez (işleme alınmış)', 403);
    }
    
    // Şikayeti güncelle
    $updateStmt = $db->prepare("
        UPDATE complaints 
        SET title = :title, 
            description = :description,
            address = :address,
            latitude = :latitude,
            longitude = :longitude
        WHERE id = :id
    ");
    
    $updateStmt->execute([
        'id' => $complaintId,
        'title' => $title,
        'description' => $description,
        'address' => $address,
        'latitude' => $latitude,
        'longitude' => $longitude
    ]);
    
    $stmt = $db->prepare("SELECT * FROM complaints WHERE id = :id");
    $stmt->execute(['id' => $complaintId]);
    $updatedComplaint = $stmt->fetch();

    $uploadErrors = [];
    $uploadedCount = 0;

    // Fotoğraf yükleme işlemi
    if (isset($_FILES['photos']) && !empty($_FILES['photos']['name'][0])) {
        // İzin verilen dosya tipleri ve boyutları config'den geliyor
        if (!defined('ALLOWED_IMAGE_TYPES')) define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']);
        if (!defined('MAX_FILE_SIZE')) define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
        if (!defined('UPLOAD_DIR')) define('UPLOAD_DIR', __DIR__ . '/../public/uploads/');

        foreach ($_FILES['photos']['name'] as $key => $name) {
            if ($_FILES['photos']['error'][$key] === UPLOAD_ERR_OK) {
                $tmpName = $_FILES['photos']['tmp_name'][$key];
                $fileSize = $_FILES['photos']['size'][$key];
                $fileType = $_FILES['photos']['type'][$key];
                
                if (!in_array($fileType, ALLOWED_IMAGE_TYPES)) {
                    $uploadErrors[] = "$name: Desteklenmeyen dosya türü ($fileType).";
                    continue;
                }
                
                if ($fileSize > MAX_FILE_SIZE) {
                    $uploadErrors[] = "$name: Dosya boyutu çok büyük.";
                    continue;
                }
                
                $extension = pathinfo($name, PATHINFO_EXTENSION);
                $fileName = uniqid('complaint_') . '_' . time() . '.' . $extension;
                $uploadPath = UPLOAD_DIR . 'complaints/' . $fileName;
                
                // Klasör yoksa oluştur
                if (!file_exists(dirname($uploadPath))) {
                    mkdir(dirname($uploadPath), 0777, true);
                }
                
                if (move_uploaded_file($tmpName, $uploadPath)) {
                    $photoStmt = $db->prepare("
                        INSERT INTO complaint_photos (complaint_id, photo_path, photo_type, uploaded_by)
                        VALUES (:complaint_id, :photo_path, 'evidence', :uploaded_by)
                    ");
                    $photoStmt->execute([
                        'complaint_id' => $complaintId,
                        'photo_path' => 'complaints/' . $fileName,
                        'uploaded_by' => $user['id']
                    ]);
                    $uploadedCount++;
                } else {
                    $uploadErrors[] = "$name: Dosya kaydedilemedi.";
                }
            } else {
                $uploadErrors[] = "$name: Yükleme hatası kodu: " . $_FILES['photos']['error'][$key];
            }
        }
    }
    
    // Activity log ekle
    $logStmt = $db->prepare("
        INSERT INTO activity_logs (complaint_id, user_id, action, description)
        VALUES (:complaint_id, :user_id, 'updated', 'Şikayet düzenlendi')
    ");
    $logStmt->execute([
        'complaint_id' => $complaintId,
        'user_id' => $user['id']
    ]);
    
    $message = 'Şikayet başarıyla güncellendi';
    if ($uploadedCount > 0) {
        $message .= " ($uploadedCount fotoğraf eklendi)";
    }
    if (!empty($uploadErrors)) {
        $message .= ". Bazı hatalar oluştu: " . implode(', ', $uploadErrors);
    }
    
    Response::success($updatedComplaint, $message);
    
} catch (PDOException $e) {
    error_log("Update Complaint Error: " . $e->getMessage());
    Response::error('Şikayet güncellenirken bir hata oluştu: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    error_log("Update Complaint General Error: " . $e->getMessage());
    Response::error('Şikayet güncellenirken bir hata oluştu: ' . $e->getMessage(), 500);
}


