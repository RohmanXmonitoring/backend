#!/bin/bash

# ========================================
# SCRIPT BUILD OTOMATIS
# ========================================

echo "🚀 Admin Backend - Docker Build Script"
echo "======================================"

# Pilih target
echo "Pilih target build:"
echo "1) Development"
echo "2) Production (dengan PM2)"
echo "3) Production (tanpa PM2)"
echo "4) Railway (default)"
echo "5) Multi-stage (optimal)"
read -p "Pilihan (1-5): " choice

case $choice in
  1)
    echo "📦 Building Development..."
    docker build --target development -t admin-backend:dev .
    docker run -d --name admin-backend-dev -p 5000:5000 admin-backend:dev
    ;;
  2)
    echo "📦 Building Production with PM2..."
    docker build --target production -t admin-backend:prod .
    docker run -d --name admin-backend-prod --restart unless-stopped -p 5000:5000 --env-file .env admin-backend:prod
    ;;
  3)
    echo "📦 Building Production without PM2..."
    docker build --target production-simple -t admin-backend:prod-simple .
    docker run -d --name admin-backend-prod-simple --restart unless-stopped -p 5000:5000 --env-file .env admin-backend:prod-simple
    ;;
  4)
    echo "📦 Building for Railway..."
    docker build --target railway -t admin-backend:railway .
    docker run -d --name admin-backend-railway -p 5000:5000 --env-file .env admin-backend:railway
    ;;
  5)
    echo "📦 Building Multi-stage..."
    docker build -t admin-backend:latest .
    docker run -d --name admin-backend --restart unless-stopped -p 5000:5000 --env-file .env admin-backend:latest
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo "✅ Build complete!"
echo "📊 Container status:"
docker ps | grep admin-backend
echo ""
echo "📝 View logs: docker logs -f <container-name>"
