#!/bin/bash

# Şikayet ve Görev Yönetim Sistemi - Otomatik Veritabanı Kurulum Scripti
# Bu script varsayılan değerlerle otomatik olarak veritabanını oluşturur

echo "=========================================="
echo "Otomatik Veritabanı Kurulum Başlatılıyor..."
echo "=========================================="

# Varsayılan değerler
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "Kullanılan ayarlar:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo ""

# PostgreSQL'in kurulu olup olmadığını kontrol et
if ! command -v psql &> /dev/null; then
    echo "❌ HATA: PostgreSQL bulunamadı!"
    echo "Lütfen PostgreSQL'i kurun: https://www.postgresql.org/download/"
    exit 1
fi

# Şema dosyasının varlığını kontrol et
if [ ! -f "database/schema.sql" ]; then
    echo "❌ HATA: database/schema.sql dosyası bulunamadı!"
    exit 1
fi

# PGPASSWORD environment variable ile şifreyi geç
export PGPASSWORD=$DB_PASSWORD

# Veritabanını oluştur
echo "Veritabanı oluşturuluyor..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS complaint_management_system;" 2>/dev/null
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE complaint_management_system;" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ HATA: Veritabanı oluşturulamadı!"
    echo "Bağlantı bilgilerini kontrol edin veya environment variable'ları ayarlayın:"
    echo "  export DB_USER=postgres"
    echo "  export DB_PASSWORD=your_password"
    echo "  export DB_HOST=localhost"
    echo "  export DB_PORT=5432"
    unset PGPASSWORD
    exit 1
fi

echo "✓ Veritabanı oluşturuldu"

# Şemayı yükle
echo "Şema yükleniyor..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d complaint_management_system -f database/schema.sql

if [ $? -ne 0 ]; then
    echo "❌ HATA: Şema yüklenemedi!"
    unset PGPASSWORD
    exit 1
fi

echo "✓ Şema başarıyla yüklendi"

# Şifreyi temizle
unset PGPASSWORD

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

