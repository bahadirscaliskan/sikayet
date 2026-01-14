<?php
/**
 * Veritabanı Bağlantı Ayarları
 */

class Database {
    private static $instance = null;
    private $connection;
    
    // MySQL ayarları
    private $host = 'localhost';
    private $dbname = 'complaint_management_system';
    private $username = 'root'; // Varsayılan: root
    private $password = ''; // Varsayılan: boş
    private $port = '3306';
    private $charset = 'utf8mb4';
    
    private function __construct() {
        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->dbname};charset={$this->charset}";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->charset} COLLATE {$this->charset}_unicode_ci"
            ];
            
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            die(json_encode([
                'success' => false,
                'message' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()
            ]));
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    // Singleton pattern - clone ve unserialize engelleme
    private function __clone() {}
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}
