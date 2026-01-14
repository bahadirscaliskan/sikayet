#!/usr/bin/env php
<?php
/**
 * Şikayet ve Görev Yönetim Sistemi - Veritabanı Kurulum Scripti (PHP)
 * 
 * Kullanım: php setup.php
 */

echo "==========================================\n";
echo "MySQL Veritabanı Kurulum Başlatılıyor...\n";
echo "==========================================\n\n";

// MySQL'in kurulu olup olmadığını kontrol et
$mysqlPath = trim(shell_exec('which mysql 2>/dev/null'));
if (empty($mysqlPath)) {
    echo "❌ HATA: MySQL client bulunamadı!\n";
    echo "Lütfen MySQL'i kurun (brew install mysql veya mysql-client)\n";
    exit(1);
}

echo "✓ MySQL bulundu\n\n";

// Veritabanı bilgilerini al
echo "Veritabanı bağlantı bilgilerini girin:\n";
$dbUser = readline("MySQL kullanıcı adı (varsayılan: root): ");
$dbUser = empty($dbUser) ? 'root' : $dbUser;

$dbPassword = readline("MySQL şifresi (varsayılan: boş): ");
$dbHost = readline("MySQL host (varsayılan: localhost): ");
$dbHost = empty($dbHost) ? 'localhost' : $dbHost;

$dbPort = readline("MySQL port (varsayılan: 3306): ");
$dbPort = empty($dbPort) ? '3306' : $dbPort;

// Şema dosyasının varlığını kontrol et
$schemaFile = __DIR__ . '/database/schema_mysql.sql';
if (!file_exists($schemaFile)) {
    echo "❌ HATA: database/schema_mysql.sql dosyası bulunamadı!\n";
    exit(1);
}

echo "\nVeritabanı oluşturuluyor...\n";

// MySQL komutunu hazırla
$passwordParam = empty($dbPassword) ? "" : " -p'{$dbPassword}'";

// Veritabanını oluştur ve şemayı yükle
$command = "mysql -h {$dbHost} -P {$dbPort} -u {$dbUser}{$passwordParam} < \"{$schemaFile}\" 2>&1";

$output = [];
$returnVar = 0;
exec($command, $output, $returnVar);

if ($returnVar !== 0) {
    echo "❌ HATA: Veritabanı oluşturulamadı veya şema yüklenemedi!\n";
    echo "Çıktı: " . implode("\n", $output) . "\n";
    echo "Kullanıcı adı, şifre ve bağlantı bilgilerini kontrol edin.\n";
    exit(1);
}

echo "✓ Veritabanı ve şema başarıyla yüklendi\n\n";

echo "==========================================\n";
echo "✅ Kurulum Tamamlandı!\n";
echo "==========================================\n\n";
echo "Varsayılan Kullanıcılar:\n";
echo "  Admin:    admin@example.com / admin123\n";
echo "  Personel:  staff@example.com / staff123\n\n";
echo "Sonraki adımlar:\n";
echo "1. config/database.php dosyasında veritabanı bilgilerini güncelleyin\n";
echo "   - Host: {$dbHost}\n";
echo "   - Port: {$dbPort}\n";
echo "   - User: {$dbUser}\n";
echo "   - Password: [girdiğiniz şifre]\n";
echo "2. Web sunucusunu başlatın (php -S localhost:8001)\n\n";
