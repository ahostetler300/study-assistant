#!/bin/bash
# Study Assistant - Automated Update and Startup Script

# 0. Wait for network connectivity
echo "🌐 Waiting for network connectivity..."
until ping -c 1 github.com &>/dev/null; do
    echo "⏳ Still waiting for internet... (retrying in 5s)"
    sleep 5
done
echo "✅ Internet connected!"

# 1. Navigate to the project root
cd "$(dirname "$0")" || exit

# 2. Backup local database
echo "📂 Backing up mastery data..."
mkdir -p backups
cp database/study-guide.db "backups/study_backup_$(date +%Y%m%d_%H%M%S).db" 2>/dev/null || true

# 3. Pull latest code from GitHub
echo "🔄 Fetching updates from GitHub..."
git fetch origin main
git reset --hard origin/main

# 4. Web Application Lifecycle
echo "📦 Checking system and python dependencies..."

# Tesseract Check
if ! command -v tesseract &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y tesseract-ocr
fi

# Python Packages
for pkg in markitdown ebooklib beautifulsoup4 markdownify; do
    if ! python3 -c "import $pkg" &> /dev/null 2>&1; then
        echo "Installing $pkg..."
        python3 -m pip install $pkg --break-system-packages || python3 -m pip install $pkg
    fi
done

cd web || exit

echo "📦 Checking for dependency updates..."
npm install
npm install sharp

echo "🗄️ Synchronizing database schema..."
# This ensures new AI features (like caching) are added to your existing DB
# Using db push for maximum resilience on Raspberry Pi hardware
npx prisma db push
npx prisma generate

echo "🏗️ Rebuilding the application..."
unset NODE_ENV && export NODE_ENV=production && npm run build
cd ..

# 5. PM2 Stack Management
echo "🚀 Restarting application stack..."
# Checks if process is running; if not, starts it using the ecosystem config
pm2 restart study-assistant --update-env || pm2 start scripts/ecosystem.config.js --name study-assistant

# 6. Persistence
pm2 save

echo "✅ Study Assistant is updated and running!"
