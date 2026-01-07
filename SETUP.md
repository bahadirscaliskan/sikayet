# Veritabanı Kurulum Kılavuzu

## 🚀 Hızlı Kurulum (Önerilen)

### Adım 1: PostgreSQL'i Başlatın

**macOS (Homebrew):**
```bash
brew services start postgresql
```

**Linux (systemd):**
```bash
sudo systemctl start postgresql
```

**Windows:**
PostgreSQL servisini Services panelinden başlatın.

### Adım 2: Otomatik Kurulum Script'ini Çalıştırın

```bash
./quick-setup.sh
```

Bu script:
- ✅ PostgreSQL'in çalışıp çalışmadığını kontrol eder
- ✅ Çalışmıyorsa başlatmayı dener
- ✅ Veritabanını otomatik oluşturur
- ✅ Şemayı yükler

## 📋 Diğer Kurulum Yöntemleri

### Yöntem 1: İnteraktif Setup
```bash
./setup.sh
```
Size sorular sorarak veritabanı bilgilerini alır.

### Yöntem 2: Otomatik Setup (Environment Variables ile)
```bash
export DB_USER=postgres
export DB_PASSWORD=your_password
./setup-auto.sh
```

### Yöntem 3: Makefile
```bash
make setup-auto DB_PASSWORD=your_password
```

### Yöntem 4: Manuel Kurulum
```bash
psql -U postgres -f database/schema.sql
```

## ⚙️ Yapılandırma

Kurulum tamamlandıktan sonra `config/database.php` dosyasını güncelleyin:

```php
private $host = 'localhost';
private $dbname = 'complaint_management_system';
private $username = 'postgres';  // veya kullanıcı adınız
private $password = '';           // şifreniz varsa buraya
private $port = '5432';
```

## ✅ Kurulum Kontrolü

Veritabanının başarıyla oluşturulup oluşturulmadığını kontrol edin:

```bash
psql -U postgres -d complaint_management_system -c "SELECT COUNT(*) FROM users;"
```

Veya Makefile ile:
```bash
make test
```

## 🔧 Sorun Giderme

### PostgreSQL çalışmıyor
```bash
# macOS
brew services restart postgresql

# Linux
sudo systemctl restart postgresql
```

### Bağlantı hatası
- PostgreSQL servisinin çalıştığından emin olun
- Kullanıcı adı ve şifrenin doğru olduğunu kontrol edin
- `pg_hba.conf` dosyasında gerekli izinlerin olduğundan emin olun

### Veritabanı zaten var hatası
```bash
# Veritabanını sil ve yeniden oluştur
make clean
make setup-auto
```

## 📝 Varsayılan Kullanıcılar

Kurulum sonrası otomatik oluşturulan kullanıcılar:

- **Admin**: admin@example.com / admin123
- **Personel**: staff@example.com / staff123

⚠️ **ÖNEMLİ**: Production ortamında mutlaka bu şifreleri değiştirin!

