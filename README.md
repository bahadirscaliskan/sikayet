# Şikayet ve Görev Yönetim Sistemi

Çoklu platformlu (Web ve Mobil) bir şikayet ve görev yönetim sistemi.

## Teknoloji Yığını

- **Backend**: Core PHP (Frameworksüz), PDO, PostgreSQL
- **Web Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Veritabanı**: PostgreSQL
- **API**: REST API (JSON formatında)

## Kurulum

### Otomatik Kurulum (Önerilen)

**Seçenek 1: İnteraktif Setup Script (Önerilen)**
```bash
./setup.sh
```
Bu script size sorular sorarak veritabanı bilgilerini alır ve otomatik olarak kurulumu yapar.

**Seçenek 2: Otomatik Setup Script (Varsayılan Değerlerle)**
```bash
# Environment variable'ları ayarlayın (opsiyonel)
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_HOST=localhost
export DB_PORT=5432

# Script'i çalıştırın
./setup-auto.sh
```

**Seçenek 3: PHP Setup Script**
```bash
php setup.php
```

### Manuel Kurulum

Eğer script'leri kullanmak istemiyorsanız:

1. Veritabanını manuel olarak oluşturun:
```bash
psql -U postgres -f database/schema.sql
```

2. `config/database.php` dosyasında veritabanı bilgilerini güncelleyin:
```php
private $host = 'localhost';
private $dbname = 'complaint_management_system';
private $username = 'postgres';
private $password = 'your_password';
private $port = '5432';
```

3. Web sunucusunu yapılandırın (Apache veya Nginx)

## Varsayılan Kullanıcılar

- **Admin**: admin@example.com / admin123
- **Personel**: staff@example.com / staff123

## Proje Yapısı

- `/api` - REST API endpoints
- `/config` - Yapılandırma dosyaları
- `/core` - Core sınıflar
- `/database` - SQL şema dosyası
- `/public` - Web frontend
- `/uploads` - Yüklenen dosyalar
- `/logs` - Log dosyaları

