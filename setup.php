#!/usr/bin/env php
<?php
/**
 * Şikayet ve İstek Yönetim Sistemi - Veritabanı Kurulum Scripti (PHP)
 * 
 * Kullanım: php setup.php
 */

echo "==========================================\n";
echo "Veritabanı Kurulum Başlatılıyor...\n";
echo "==========================================\n\n";

// PostgreSQL'in kurulu olup olmadığını kontrol et
$psqlPath = trim(shell_exec('which psql 2>/dev/null'));
if (empty($psqlPath)) {
    echo "❌ HATA: PostgreSQL bulunamadı!\n";
    echo "Lütfen PostgreSQL'i kurun: https://www.postgresql.org/download/\n";
    exit(1);
}

echo "✓ PostgreSQL bulundu\n\n";

// Veritabanı bilgilerini al
echo "Veritabanı bağlantı bilgilerini girin:\n";
$dbUser = readline("PostgreSQL kullanıcı adı (varsayılan: postgres): ");
$dbUser = empty($dbUser) ? 'postgres' : $dbUser;

$dbPassword = readline("PostgreSQL şifresi: ");
$dbHost = readline("PostgreSQL host (varsayılan: localhost): ");
$dbHost = empty($dbHost) ? 'localhost' : $dbHost;

$dbPort = readline("PostgreSQL port (varsayılan: 5432): ");
$dbPort = empty($dbPort) ? '5432' : $dbPort;

// Şema dosyasının varlığını kontrol et
$schemaFile = __DIR__ . '/database/schema.sql';
if (!file_exists($schemaFile)) {
    echo "❌ HATA: database/schema.sql dosyası bulunamadı!\n";
    exit(1);
}

echo "\nVeritabanı oluşturuluyor...\n";

// Veritabanını oluştur
$commands = [
    // Eski veritabanını sil (varsa)
    "PGPASSWORD='{$dbPassword}' psql -h {$dbHost} -p {$dbPort} -U {$dbUser} -d postgres -c \"DROP DATABASE IF EXISTS complaint_management_system;\" 2>&1",
    
    // Yeni veritabanını oluştur
    "PGPASSWORD='{$dbPassword}' psql -h {$dbHost} -p {$dbPort} -U {$dbUser} -d postgres -c \"CREATE DATABASE complaint_management_system;\" 2>&1",
    
    // Şemayı yükle
    "PGPASSWORD='{$dbPassword}' psql -h {$dbHost} -p {$dbPort} -U {$dbUser} -d complaint_management_system -f {$schemaFile} 2>&1"
];

foreach ($commands as $index => $command) {
    $output = [];
    $returnVar = 0;
    exec($command, $output, $returnVar);
    
    if ($returnVar !== 0 && $index !== 0) { // İlk komut (DROP) başarısız olabilir, önemli değil
        echo "❌ HATA: Komut başarısız oldu!\n";
        echo "Çıktı: " . implode("\n", $output) . "\n";
        exit(1);
    }
}

echo "✓ Veritabanı oluşturuldu\n";
echo "✓ Şema başarıyla yüklendi\n\n";

echo "==========================================\n";
echo "✅ Kurulum Tamamlandı!\n";
echo "==========================================\n\n";
echo "Varsayılan Kullanıcılar:\n";
echo "  Admin:    admin@example.com / admin123\n";
echo "  Personel:  staff@example.com / staff123\n\n";
echo "⚠️  ÖNEMLİ: Production ortamında bu şifreleri değiştirin!\n\n";
echo "Sonraki adımlar:\n";
echo "1. config/database.php dosyasında veritabanı bilgilerini güncelleyin\n";
echo "   - Host: {$dbHost}\n";
echo "   - Port: {$dbPort}\n";
echo "   - User: {$dbUser}\n";
echo "   - Password: [girdiğiniz şifre]\n";
echo "2. Web sunucusunu başlatın\n\n";

