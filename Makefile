# Şikayet ve Görev Yönetim Sistemi - Makefile

.PHONY: help setup setup-auto clean test

# Varsayılan değerler
DB_USER ?= postgres
DB_PASSWORD ?= postgres
DB_HOST ?= localhost
DB_PORT ?= 5432

help:
	@echo "Kullanılabilir komutlar:"
	@echo "  make setup       - İnteraktif veritabanı kurulumu"
	@echo "  make setup-auto  - Otomatik veritabanı kurulumu (varsayılan değerlerle)"
	@echo "  make clean       - Veritabanını sil"
	@echo "  make test        - Veritabanı bağlantısını test et"
	@echo ""
	@echo "Örnek kullanım:"
	@echo "  make setup-auto DB_USER=postgres DB_PASSWORD=mypass"

setup:
	@./setup.sh

setup-auto:
	@DB_USER=$(DB_USER) DB_PASSWORD=$(DB_PASSWORD) DB_HOST=$(DB_HOST) DB_PORT=$(DB_PORT) ./setup-auto.sh

clean:
	@echo "Veritabanı siliniyor..."
	@PGPASSWORD=$(DB_PASSWORD) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d postgres -c "DROP DATABASE IF EXISTS complaint_management_system;" 2>/dev/null || true
	@echo "✓ Veritabanı silindi"

test:
	@echo "Veritabanı bağlantısı test ediliyor..."
	@PGPASSWORD=$(DB_PASSWORD) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d complaint_management_system -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1 && echo "✓ Bağlantı başarılı!" || echo "❌ Bağlantı başarısız!"

