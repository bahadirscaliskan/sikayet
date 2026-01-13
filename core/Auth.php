<?php
/**
 * Kimlik Doğrulama Sınıfı
 */

class Auth {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        
        // Session başlat (eğer başlatılmamışsa)
        if (session_status() === PHP_SESSION_NONE) {
            if (!headers_sent()) {
                session_start();
            }
        }
    }
    
    /**
     * Kullanıcı girişi
     */
    public function login($email, $password) {
        try {
            $stmt = $this->db->prepare("
                SELECT id, email, password_hash, full_name, role, is_active, email_verified 
                FROM users 
                WHERE email = :email
            ");
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch();
            
            if (!$user) {
                return ['success' => false, 'message' => 'E-posta veya şifre hatalı'];
            }
            
            if (!$user['is_active']) {
                return ['success' => false, 'message' => 'Hesabınız aktif değil'];
            }

            // E-posta doğrulama kontrolü
            if (!$user['email_verified']) {
                return ['success' => false, 'message' => 'Lütfen giriş yapmadan önce e-posta adresinizi doğrulayın.'];
            }
            
            if (!password_verify($password, $user['password_hash'])) {
                return ['success' => false, 'message' => 'E-posta veya şifre hatalı'];
            }
            
            // Son giriş zamanını güncelle
            $updateStmt = $this->db->prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = :id");
            $updateStmt->execute(['id' => $user['id']]);
            
            // Session oluştur
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_name'] = $user['full_name'];
            $_SESSION['user_role'] = $user['role'];
            
            return [
                'success' => true,
                'message' => 'Giriş başarılı',
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'full_name' => $user['full_name'],
                    'role' => $user['role']
                ]
            ];
        } catch (PDOException $e) {
            error_log("Login Error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Bir hata oluştu'];
        }
    }

    /**
     * ID ile kullanıcı girişi (Google Auth vb. için)
     */
    public function loginById($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT id, email, full_name, role, is_active 
                FROM users 
                WHERE id = :id
            ");
            $stmt->execute(['id' => $userId]);
            $user = $stmt->fetch();
            
            if (!$user) {
                return ['success' => false, 'message' => 'Kullanıcı bulunamadı'];
            }
            
            if (!$user['is_active']) {
                return ['success' => false, 'message' => 'Hesabınız aktif değil'];
            }
            
            // Son giriş zamanını güncelle
            $updateStmt = $this->db->prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = :id");
            $updateStmt->execute(['id' => $user['id']]);
            
            // Session oluştur
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_name'] = $user['full_name'];
            $_SESSION['user_role'] = $user['role'];
            
            return [
                'success' => true,
                'message' => 'Giriş başarılı',
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'full_name' => $user['full_name'],
                    'role' => $user['role']
                ]
            ];
        } catch (PDOException $e) {
            error_log("LoginById Error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Bir hata oluştu'];
        }
    }
    
    /**
     * Kullanıcı kaydı
     */
    public function register($email, $password, $fullName, $phone = null, $address = null) {
        try {
            // E-posta kontrolü
            $checkStmt = $this->db->prepare("SELECT id FROM users WHERE email = :email");
            $checkStmt->execute(['email' => $email]);
            if ($checkStmt->fetch()) {
                return ['success' => false, 'message' => 'Bu e-posta adresi zaten kullanılıyor'];
            }
            
            // Şifre hash'leme
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $verificationToken = bin2hex(random_bytes(32));
            
            $stmt = $this->db->prepare("
                INSERT INTO users (email, password_hash, full_name, phone, address, role, verification_token)
                VALUES (:email, :password_hash, :full_name, :phone, :address, 'citizen', :verification_token)
                RETURNING id, email, full_name, role
            ");
            
            $stmt->execute([
                'email' => $email,
                'password_hash' => $passwordHash,
                'full_name' => $fullName,
                'phone' => $phone,
                'address' => $address,
                'verification_token' => $verificationToken
            ]);
            
            $user = $stmt->fetch();
            
            // E-posta doğrulama maili gönder
            require_once __DIR__ . '/MailService.php';
            $mailService = new MailService();
            $mailService->sendVerificationEmail($email, $verificationToken);
            
            return [
                'success' => true,
                'message' => 'Kayıt başarılı. Lütfen e-postanıza gönderilen doğrulama linkine tıklayın.',
                'user' => $user
            ];
        } catch (PDOException $e) {
            error_log("Register Error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Kayıt sırasında bir hata oluştu'];
        }
    }
    
    /**
     * Kullanıcı çıkışı
     */
    public function logout() {
        session_destroy();
        return ['success' => true, 'message' => 'Çıkış başarılı'];
    }
    
    /**
     * Mevcut kullanıcıyı kontrol et
     */
    public function checkAuth() {
        if (!isset($_SESSION['user_id'])) {
            return false;
        }
        return [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['user_email'],
            'name' => $_SESSION['user_name'],
            'role' => $_SESSION['user_role']
        ];
    }
    
    /**
     * Rol kontrolü
     */
    public function hasRole($requiredRole) {
        $user = $this->checkAuth();
        if (!$user) {
            return false;
        }
        
        if ($requiredRole === 'admin') {
            return $user['role'] === 'admin';
        }
        
        if ($requiredRole === 'staff') {
            return in_array($user['role'], ['admin', 'staff']);
        }
        
        return true; // citizen için
    }
    
    /**
     * API için auth middleware
     */
    public function requireAuth() {
        $user = $this->checkAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Yetkilendirme gerekli']);
            exit();
        }
        return $user;
    }
    
    /**
     * API için rol kontrolü middleware
     */
    public function requireRole($role) {
        $user = $this->requireAuth();
        if (!$this->hasRole($role)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Bu işlem için yetkiniz yok']);
            exit();
        }
        return $user;
    }
}
