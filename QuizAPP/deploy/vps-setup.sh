#!/bin/bash
# ================================================================
# First-time VPS setup script
# Run this ONCE on a fresh Ubuntu 22.04/24.04 VPS
#
# Tested on: Hetzner CX22, Oracle Cloud Free Tier, DigitalOcean,
#            AWS Lightsail, any Ubuntu VPS with 1GB+ RAM
#
# Usage:  ssh root@your-server-ip
#         curl -sSL https://raw.githubusercontent.com/paraspahwa/QuizAPP/main/deploy/vps-setup.sh | bash
# ================================================================
set -e

echo "🔧 Setting up MedQuizAI server..."

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    apt-get install -y docker-compose-plugin
fi

# Create app user (non-root)
if ! id "appuser" &>/dev/null; then
    useradd -m -s /bin/bash -G docker appuser
    echo "👤 Created user: appuser"
fi

# Clone repo
if [ ! -d "/home/appuser/QuizAPP" ]; then
    su - appuser -c "git clone https://github.com/paraspahwa/QuizAPP.git"
fi

# Setup .env
if [ ! -f "/home/appuser/QuizAPP/.env" ]; then
    cp /home/appuser/QuizAPP/.env.example /home/appuser/QuizAPP/.env
    echo ""
    echo "⚠️  IMPORTANT: Edit /home/appuser/QuizAPP/.env and add your:"
    echo "    - OPENAI_API_KEY"
    echo "    - SECRET_KEY (run: openssl rand -hex 32)"
    echo ""
fi

# Setup firewall
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    echo "🔒 Firewall configured (22, 80, 443 open)"
fi

# Enable swap (important for 1GB RAM VPS)
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "💾 2GB swap enabled"
fi

echo ""
echo "================================================"
echo "  ✅ VPS setup complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env:    nano /home/appuser/QuizAPP/.env"
echo "  2. Edit domain:  nano /home/appuser/QuizAPP/deploy/Caddyfile"
echo "  3. Start app:"
echo "     cd /home/appuser/QuizAPP"
echo "     docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  For local/IP-only (no domain):"
echo "     docker compose up -d --build"
echo ""
