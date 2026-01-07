#!/bin/bash

# Hızlı Kurulum Scripti - PostgreSQL başlat ve veritabanını oluştur

echo "=========================================="
echo "Hızlı Kurulum Başlatılıyor..."
echo "=========================================="

# PostgreSQL'i başlatmayı dene
echo "PostgreSQL servisi kontrol ediliyor..."

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "PostgreSQL çalışmıyor, başlatılıyor..."
    
    # macOS Homebrew için
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
            echo "⚠️  PostgreSQL servisi başlatılamadı."
            echo "Lütfen manuel olarak başlatın:"
            echo "  brew services start postgresql"
            echo ""
            echo "Veya PostgreSQL'i manuel başlattıktan sonra bu script'i tekrar çalıştırın."
            exit 1
        }
        
        echo "PostgreSQL başlatılıyor, 3 saniye bekleniyor..."
        sleep 3
    else
        echo "⚠️  Homebrew bulunamadı. PostgreSQL'i manuel olarak başlatın."
        exit 1
    fi
fi

# PostgreSQL hazır mı kontrol et
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "❌ PostgreSQL hala hazır değil. Lütfen manuel olarak başlatın."
    exit 1
fi

echo "✓ PostgreSQL çalışıyor"

# Kullanıcı adını belirle (macOS'ta genellikle kullanıcı adı)
DB_USER=${DB_USER:-$(whoami)}
DB_PASSWORD=${DB_PASSWORD:-""}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo ""
echo "Veritabanı bilgileri:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo ""

# Şema dosyasını kontrol et
if [ ! -f "database/schema.sql" ]; then
    echo "❌ HATA: database/schema.sql dosyası bulunamadı!"
    exit 1
fi

# Veritabanını oluştur
echo "Veritabanı oluşturuluyor..."

if [ -z "$DB_PASSWORD" ]; then
    # Şifre yoksa
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS complaint_management_system;" 2>/dev/null
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE complaint_management_system;" 2>/dev/null
    
    if [ $? -ne 0 ]; then
        echo "❌ HATA: Veritabanı oluşturulamadı!"
        echo "Kullanıcı adı veya izinleri kontrol edin."
        exit 1
    fi
    
    echo "✓ Veritabanı oluşturuldu"
    
    # Şemayı yükle
    echo "Şema yükleniyor..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d complaint_management_system -f database/schema.sql
    
    if [ $? -ne 0 ]; then
        echo "❌ HATA: Şema yüklenemedi!"
        exit 1
    fi
else
    # Şifre varsa
    export PGPASSWORD=$DB_PASSWORD
    
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS complaint_management_system;" 2>/dev/null
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE complaint_management_system;" 2>/dev/null
    
    if [ $? -ne 0 ]; then
        echo "❌ HATA: Veritabanı oluşturulamadı!"
        unset PGPASSWORD
        exit 1
    fi
    
    echo "✓ Veritabanı oluşturuldu"
    
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d complaint_management_system -f database/schema.sql
    
    if [ $? -ne 0 ]; then
        echo "❌ HATA: Şema yüklenemedi!"
        unset PGPASSWORD
        exit 1
    fi
    
    unset PGPASSWORD
fi

echo "✓ Şema başarıyla yüklendi"

echo ""
echo "=========================================="
echo "✅ Kurulum Tamamlandı!"
echo "=========================================="
echo ""
echo "Varsayılan Kullanıcılar:"
echo "  Admin:    admin@example.com / admin123"
echo "  Personel:  staff@example.com / staff123"
echo ""
echo "⚠️  ÖNEMLİ: Production ortamında bu şifreleri değiştirin!"
echo ""
echo "Sonraki adımlar:"
echo "1. config/database.php dosyasında veritabanı bilgilerini güncelleyin:"
echo "   - Host: $DB_HOST"
echo "   - Port: $DB_PORT"
echo "   - User: $DB_USER"
echo "   - Password: [şifre yoksa boş bırakın]"
echo "2. Web sunucusunu başlatın"
echo ""

