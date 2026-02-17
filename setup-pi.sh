#!/bin/bash

# Study Assistant - Interactive Raspberry Pi Setup
# This script will guide you through the installation process.

set -e # Exit on any error

echo "------------------------------------------------"
echo "📚 Welcome to the Universal Study Guide Setup Utility"
echo "------------------------------------------------"

# Function to ask for confirmation
confirm() {
    read -p "$1 (y/n): " response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            true
            ;;
        *)
            false
            ;;
    esac
}

# 1. System Dependency Check
echo "🔍 Checking system dependencies..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 22 first."
    echo "Run: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
echo "✅ Node.js $(node -v) found."

# Check for Python 3 (needed for the processing skill)
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. It is required for document processing."
    echo "Run: sudo apt-get update && sudo apt-get install -y python3"
    exit 1
fi
echo "✅ Python $(python3 --version) found."

# 2. Environment Setup (SETTINGS_SECRET)
echo ""
echo "🔐 Configuring Security..."
mkdir -p database data/uploads data/processed_content data/raw

# .env.local for Infrastructure Config (SETTINGS_SECRET)
INFRA_FILE="web/.env.local"
if [ ! -f "$INFRA_FILE" ]; then
    echo "Creating $INFRA_FILE..."
    # Generate a random 32-character hex secret
    SECRET=$(openssl rand -hex 32 || echo "fallback-secret-for-study-assistant-on-pi")
    echo "DATABASE_URL=\"file:../../database/study-guide.db\"" > "$INFRA_FILE"
    echo "SETTINGS_SECRET=\"$SECRET\"" >> "$INFRA_FILE"
    echo "✅ Generated new SETTINGS_SECRET in $INFRA_FILE."
else
    if grep -q "SETTINGS_SECRET" "$INFRA_FILE"; then
        echo "✅ SETTINGS_SECRET already configured in $INFRA_FILE."
    else
        SECRET=$(openssl rand -hex 32 || echo "fallback-secret-for-study-assistant-on-pi")
        echo "SETTINGS_SECRET=\"$SECRET\"" >> "$INFRA_FILE"
        echo "✅ Added missing SETTINGS_SECRET to $INFRA_FILE."
    fi
fi

# .secrets.env for Application-Managed Config
SECRETS_FILE="web/.secrets.env"
if [ ! -f "$SECRETS_FILE" ]; then
    echo "Initializing $SECRETS_FILE..."
    echo "GEMINI_API_KEY_ENCRYPTED=\"\"" > "$SECRETS_FILE"
    echo "✅ Created $SECRETS_FILE for encrypted keys."
fi

# 3. Install Application Dependencies
echo ""
if confirm "📦 Install web application dependencies?"; then
    echo "Running npm install in ./web..."
    cd web && npm install && cd ..
    echo "✅ Dependencies installed."
fi

# 4. Database Initialization
echo ""
if confirm "🗄️ Initialize/Update Database schema?"; then
    echo "Running Prisma migrations..."
    cd web && npx prisma db push && npx prisma generate && cd ..
    echo "✅ Database ready."
fi

# 5. Build Application
echo ""
if confirm "🏗️ Build the Next.js application? (This takes several minutes on Pi)"; then
    echo "Building application..."
    cd web && npm run build && cd ..
    echo "✅ Build complete."
fi

# 6. PM2 Setup
echo ""
if confirm "🚀 Configure PM2 to auto-start on boot?"; then
    if ! command -v pm2 &> /dev/null; then
        echo "🔄 Installing PM2 process manager..."
        sudo npm install -g pm2
    fi

    echo "🎬 Starting the Study Assistant with PM2..."
    pm2 delete study-assistant 2>/dev/null || true
    pm2 start scripts/ecosystem.config.js
    
    echo "💾 Saving PM2 list and setting up startup script..."
    pm2 save
    
    # Attempt to auto-run startup command
    echo "🔧 Setting up system startup..."
    # pm2 startup returns a command that needs to be run with sudo
    STARTUP_CMD=$(pm2 startup | grep "sudo env PATH" || echo "")
    if [ -n "$STARTUP_CMD" ]; then
        echo "Running: $STARTUP_CMD"
        eval "$STARTUP_CMD"
    else
        echo "⚠️ Could not automatically detect startup command. Please run 'pm2 startup' manually."
    fi
    echo "✅ PM2 configured."
fi

echo ""
echo "------------------------------------------------"
echo "🎉 Setup Complete!"
echo "------------------------------------------------"
echo "Your Study Assistant will be available at http://localhost:3003"
echo "Admin Settings (to configure Gemini API Key): http://localhost:3003/settings"
echo ""
echo "To check status: pm2 status"
echo "To check logs: pm2 logs study-assistant"
echo "------------------------------------------------"
