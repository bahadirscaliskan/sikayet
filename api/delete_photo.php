<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

$auth = new Auth();
$db = Database::getInstance()->getConnection();

$user = $auth->requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['photo_id'])) {
    Response::error('Fotoğraf ID gerekli', 400);
}

$photoId = (int)$input['photo_id'];

try {
    // Fotoğrafı ve şikayeti getir
    $stmt = $db->prepare("
        SELECT cp.*, c.user_id as complaint_owner, c.status
        FROM complaint_photos cp
        JOIN complaints c ON cp.complaint_id = c.id
        WHERE cp.id = :id
    ");
    $stmt->execute(['id' => $photoId]);
    $photo = $stmt->fetch();

    if (!$photo) {
        Response::error('Fotoğraf bulunamadı', 404);
    }

    // Yetki kontrolü: Admin veya Şikayet sahibi
    if ($user['role'] !== 'admin' && $user['id'] != $photo['complaint_owner']) {
        Response::error('Bu fotoğrafı silme yetkiniz yok', 403);
    }

    // Durum kontrolü: Sadece pending veya assigned durumunda silinebilir (Admin hariç)
    // Ancak user talebi "edit" modal içindeydi, edit modal zaten pending/assigned kısıtlı.
    // Yine de güvenlik için ekleyelim.
    if ($user['role'] !== 'admin' && !in_array($photo['status'], ['pending', 'assigned'])) {
        Response::error('İşleme alınmış şikayetlerin fotoğrafları silinemez', 403);
    }

    // Dosyayı sil
    $filePath = __DIR__ . '/../public/uploads/' . $photo['photo_path'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    // Veritabanından sil
    $deleteStmt = $db->prepare("DELETE FROM complaint_photos WHERE id = :id");
    $deleteStmt->execute(['id' => $photoId]);

    Response::success(null, 'Fotoğraf başarıyla silindi');

} catch (PDOException $e) {
    error_log("Delete Photo Error: " . $e->getMessage());
    Response::error('Fotoğraf silinirken bir hata oluştu', 500);
}
