#!/bin/bash
# MediaHub Frontend Deploy Script
# Run this on the Alibaba Cloud server

set -e

# === Configuration ===
REPO_URL="https://github.com/iocrazy/media-router.git"
DEPLOY_DIR="/opt/mediahub"
SITE_DIR=""  # Will be set below

# Auto-detect 1Panel OpenResty site path
if [ -d "/opt/1panel/apps/openresty/openresty/www/sites/media.iocrazy.com" ]; then
    SITE_DIR="/opt/1panel/apps/openresty/openresty/www/sites/media.iocrazy.com/index"
elif [ -d "/www/sites/media.iocrazy.com" ]; then
    SITE_DIR="/www/sites/media.iocrazy.com"
else
    echo "Error: Cannot find site directory. Please set SITE_DIR manually."
    echo "Check your 1Panel website config for the site root path."
    exit 1
fi

echo "=== MediaHub Frontend Deploy ==="
echo "Deploy dir: $DEPLOY_DIR"
echo "Site dir: $SITE_DIR"

# Clone or pull repo
if [ -d "$DEPLOY_DIR" ]; then
    echo ">>> Pulling latest code..."
    cd "$DEPLOY_DIR"
    git pull origin master
else
    echo ">>> Cloning repository..."
    git clone "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# Build frontend
echo ">>> Installing dependencies..."
cd "$DEPLOY_DIR/frontend"
npm install

echo ">>> Building frontend..."
npm run build

# Deploy to site directory
echo ">>> Deploying to $SITE_DIR..."
mkdir -p "$SITE_DIR"
rm -rf "$SITE_DIR"/*
cp -r dist/* "$SITE_DIR/"

echo "=== Deploy complete! ==="
echo "Visit: https://media.iocrazy.com"
