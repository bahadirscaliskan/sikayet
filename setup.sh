#!/bin/bash

# Şikayet ve Görev Yönetim Sistemi - Veritabanı Kurulum Scripti

echo "=========================================="
echo "Veritabanı Kurulum Başlatılıyor..."
echo "=========================================="

# PostgreSQL'in kurulu olup olmadığını kontrol et
if ! command -v psql &> /dev/null; then
    echo "❌ HATA: PostgreSQL bulunamadı!"
    echo "Lütfen PostgreSQL'i kurun: https://www.postgresql.org/download/"
    exit 1
fi

echo "✓ PostgreSQL bulundu"

# Veritabanı bilgilerini al
read -p "PostgreSQL kullanıcı adı (varsayılan: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "PostgreSQL şifresi: " DB_PASSWORD
echo ""

read -p "PostgreSQL host (varsayılan: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "PostgreSQL port (varsayılan: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

# Şema dosyasının varlığını kontrol et
if [ ! -f "database/schema.sql" ]; then
    echo "❌ HATA: database/schema.sql dosyası bulunamadı!"
    exit 1
fi

echo ""
echo "Veritabanı oluşturuluyor..."

# PGPASSWORD environment variable ile şifreyi geç
export PGPASSWORD=$DB_PASSWORD

# Veritabanını oluştur
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS complaint_management_system;" 2>/dev/null
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE complaint_management_system;" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ HATA: Veritabanı oluşturulamadı!"
    echo "Kullanıcı adı, şifre veya bağlantı bilgilerini kontrol edin."
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
echo "Sonraki adımlar:"
echo "1. config/database.php dosyasında veritabanı bilgilerini güncelleyin"
echo "2. Web sunucusunu başlatın"
echo ""

