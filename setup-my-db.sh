#!/bin/bash

# Sizin veritabanı bilgilerinizle otomatik kurulum

echo "=========================================="
echo "Veritabanı Kurulum Başlatılıyor..."
echo "=========================================="

DB_USER="bahadir"
DB_PASSWORD="1q2w3e"
DB_HOST="localhost"
DB_PORT="5432"

export PGPASSWORD=$DB_PASSWORD

echo "Veritabanı bilgileri:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo ""

# Eski veritabanını sil
echo "Eski veritabanı kontrol ediliyor..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS complaint_management_system;" 2>/dev/null

# Yeni veritabanını oluştur
echo "Veritabanı oluşturuluyor..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE complaint_management_system;" 2>&1

if [ $? -ne 0 ]; then
    echo "❌ HATA: Veritabanı oluşturulamadı!"
    echo "PostgreSQL'in çalıştığından ve bağlantı bilgilerinin doğru olduğundan emin olun."
    unset PGPASSWORD
    exit 1
fi

echo "✓ Veritabanı oluşturuldu"

# Şemayı yükle
echo "Şema yükleniyor..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d complaint_management_system -f database/schema.sql 2>&1

if [ $? -ne 0 ]; then
    echo "❌ HATA: Şema yüklenemedi!"
    unset PGPASSWORD
    exit 1
fi

echo "✓ Şema başarıyla yüklendi"

# Kontrol et
echo ""
echo "Kurulum kontrol ediliyor..."
USER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d complaint_management_system -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)

if [ ! -z "$USER_COUNT" ] && [ "$USER_COUNT" -gt 0 ]; then
    echo "✓ Veritabanında $USER_COUNT kullanıcı bulundu"
else
    echo "⚠️  Uyarı: Kullanıcı sayısı kontrol edilemedi"
fi

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
echo "✅ config/database.php dosyası zaten güncellendi!"
echo ""

