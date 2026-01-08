<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/MailService.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? null;

if (!$email) {
    Response::error('E-posta adresi gerekli', 400);
}

$db = Database::getInstance()->getConnection();

try {
    // 1. Kullanıcı kontrolü
    $stmt = $db->prepare("SELECT id, full_name FROM users WHERE email = :email");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user) {
        // Güvenlik: Kullanıcı bulunamasa bile başarılı gibi dön (Email Enumeration'ı önlemek için)
        // Ancak geliştirme aşamasında olduğumuz için net hata dönebiliriz veya loglayabiliriz.
        // Kullanıcı deneyimi için "Eğer kayıtlıysa gönderdik" demek en iyisi.
        Response::success(null, 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.');
    }

    // 2. Tablo kontrolü ve oluşturma (Migration yönetimi olmadığı için burada check ediyoruz)
    $db->exec("
        CREATE TABLE IF NOT EXISTS password_resets (
            email VARCHAR(255) NOT NULL,
            token VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // 3. Eski tokenları temizle (Bu email için)
    $deleteStmt = $db->prepare("DELETE FROM password_resets WHERE email = :email");
    $deleteStmt->execute(['email' => $email]);

    // 4. Token oluştur ve kaydet
    $token = bin2hex(random_bytes(32));
    
    $insertStmt = $db->prepare("INSERT INTO password_resets (email, token) VALUES (:email, :token)");
    $insertStmt->execute([
        'email' => $email,
        'token' => $token
    ]);

    // 5. E-posta gönder
    $mailService = new MailService();
    $resetLink = BASE_URL . "/reset_password.html?token=" . $token . "&email=" . urlencode($email);
    
    $subject = "Şifre Sıfırlama Talebi";
    $body = "
        <h3>Merhaba {$user['full_name']},</h3>
        <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
        <p><a href='$resetLink'>Şifremi Sıfırla</a></p>
        <p>Bu talep sizden gelmediyse, bu e-postayı görmezden gelebilirsiniz.</p>
        <small>Bu bağlantı belirli bir süre sonra geçerliliğini yitirecektir.</small>
    ";

    $result = $mailService->send($email, $subject, $body);

    if ($result['success']) {
        Response::success(null, 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    } else {
        // Mail gönderilemediyse hatayı dönelim (Loglamak daha iyi olurdu ama kullanıcı bilsin)
        Response::error('E-posta gönderilirken bir hata oluştu: ' . $result['message'], 500);
    }

} catch (PDOException $e) {
    error_log("Forgot Password Error: " . $e->getMessage());
    Response::error('Bir hata oluştu', 500);
}
