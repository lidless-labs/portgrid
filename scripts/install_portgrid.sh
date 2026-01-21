#!/bin/bash

# PortGrid Installer for Proxmox/Linux
# This script installs and configures PortGrid as a systemd service

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Art
cat << "EOF"

    ____            __  ______     _     __
   / __ \____  ____/ /_/ ____/____(_)___/ /
  / /_/ / __ \/ __/ __/ / __/ ___/ / __  /
 / ____/ /_/ / / / /_/ /_/ / /  / / /_/ /
/_/    \____/_/  \__/\____/_/  /_/\__,_/

    Network Port Visualization Tool

EOF

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}       PortGrid Installation Script     ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo)${NC}"
    exit 1
fi

# Check for Node.js
echo -e "${YELLOW}Checking for Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo -e "Please install Node.js 18+ before running this script."
    echo -e "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo -e "  sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required. Found version $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}Found Node.js $(node -v)${NC}"

# Get installation directory
DEFAULT_DIR="/opt/portgrid"
read -p "Installation directory [$DEFAULT_DIR]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-$DEFAULT_DIR}

# Get LibreNMS configuration
echo ""
echo -e "${YELLOW}LibreNMS Configuration${NC}"
read -p "LibreNMS URL (e.g., https://librenms.example.com): " LIBRENMS_URL
if [ -z "$LIBRENMS_URL" ]; then
    echo -e "${RED}Error: LibreNMS URL is required${NC}"
    exit 1
fi

read -p "LibreNMS API Token: " LIBRENMS_TOKEN
if [ -z "$LIBRENMS_TOKEN" ]; then
    echo -e "${RED}Error: LibreNMS API Token is required${NC}"
    exit 1
fi

# Get port
DEFAULT_PORT=3000
read -p "Port to run PortGrid on [$DEFAULT_PORT]: " PORT
PORT=${PORT:-$DEFAULT_PORT}

# Create installation directory
echo ""
echo -e "${YELLOW}Creating installation directory...${NC}"
mkdir -p "$INSTALL_DIR"

# Copy files (assuming script is run from the portgrid directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SCRIPT_DIR/package.json" ]; then
    echo -e "${YELLOW}Copying application files...${NC}"
    cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"
else
    echo -e "${RED}Error: package.json not found. Run this script from the portgrid directory.${NC}"
    exit 1
fi

# Create .env.local
echo -e "${YELLOW}Creating environment configuration...${NC}"
cat > "$INSTALL_DIR/.env.local" << EOF
LIBRENMS_URL=$LIBRENMS_URL
LIBRENMS_API_TOKEN=$LIBRENMS_TOKEN
EOF

# Install dependencies
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$INSTALL_DIR"
npm install --production=false

# Build the application
echo ""
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Create systemd service
echo ""
echo -e "${YELLOW}Creating systemd service...${NC}"
cat > /etc/systemd/system/portgrid.service << EOF
[Unit]
Description=PortGrid - Network Port Visualization
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$PORT

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
echo -e "${YELLOW}Enabling and starting service...${NC}"
systemctl daemon-reload
systemctl enable portgrid
systemctl start portgrid

# Check if service started successfully
sleep 3
if systemctl is-active --quiet portgrid; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   PortGrid installed successfully!    ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Access PortGrid at: ${BLUE}http://$(hostname -I | awk '{print $1}'):$PORT${NC}"
    echo ""
    echo -e "Useful commands:"
    echo -e "  ${YELLOW}systemctl status portgrid${NC}  - Check service status"
    echo -e "  ${YELLOW}systemctl restart portgrid${NC} - Restart service"
    echo -e "  ${YELLOW}journalctl -u portgrid -f${NC}  - View logs"
else
    echo ""
    echo -e "${RED}Warning: Service may not have started correctly.${NC}"
    echo -e "Check logs with: journalctl -u portgrid -f"
fi
