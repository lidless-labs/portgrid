#!/bin/bash

# PortGrid Proxmox LXC Installer
# Run this script on your Proxmox host to create a container with PortGrid

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ASCII Art
cat << "EOF"

    ____            __  ______     _     __
   / __ \____  ____/ /_/ ____/____(_)___/ /
  / /_/ / __ \/ __/ __/ / __/ ___/ / __  /
 / ____/ /_/ / / / /_/ /_/ / /  / / /_/ /
/_/    \____/_/  \__/\____/_/  /_/\__,_/

    Proxmox LXC Container Installer

EOF

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}     PortGrid Proxmox Container Installer       ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if running on Proxmox
if [ ! -f /etc/pve/.version ]; then
    echo -e "${RED}Error: This script must be run on a Proxmox host.${NC}"
    exit 1
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root${NC}"
    exit 1
fi

# ============================================
# Configuration
# ============================================

# Find next available CT ID
echo -e "${YELLOW}Finding next available container ID...${NC}"
NEXT_CTID=$(pvesh get /cluster/nextid 2>/dev/null || echo "100")
echo -e "${GREEN}Next available CT ID: $NEXT_CTID${NC}"

# Prompt for CT ID
read -p "Container ID [$NEXT_CTID]: " CTID
CTID=${CTID:-$NEXT_CTID}

# Validate CTID is not in use
if pct status "$CTID" &>/dev/null; then
    echo -e "${RED}Error: Container ID $CTID already exists.${NC}"
    exit 1
fi

# Container settings
read -p "Container hostname [portgrid]: " CT_HOSTNAME
CT_HOSTNAME=${CT_HOSTNAME:-portgrid}

read -p "Container memory in MB [1024]: " CT_MEMORY
CT_MEMORY=${CT_MEMORY:-1024}

read -p "Container disk size in GB [8]: " CT_DISK
CT_DISK=${CT_DISK:-8}

read -p "Number of CPU cores [2]: " CT_CORES
CT_CORES=${CT_CORES:-2}

# Network configuration
echo ""
echo -e "${YELLOW}Network Configuration${NC}"
read -p "Use DHCP? [Y/n]: " USE_DHCP
USE_DHCP=${USE_DHCP:-Y}

if [[ "${USE_DHCP,,}" == "n" ]]; then
    read -p "IP Address (CIDR format, e.g., 192.168.1.100/24): " CT_IP
    read -p "Gateway: " CT_GW
    NET_CONFIG="name=eth0,bridge=vmbr0,ip=$CT_IP,gw=$CT_GW"
else
    NET_CONFIG="name=eth0,bridge=vmbr0,ip=dhcp"
fi

# Storage selection
echo ""
echo -e "${YELLOW}Storage Configuration${NC}"
echo "Available storage locations:"
pvesm status | grep -E "^[a-zA-Z]" | awk '{print "  " $1 " (" $2 ")"}'
echo ""
read -p "Storage location [local-lvm]: " CT_STORAGE
CT_STORAGE=${CT_STORAGE:-local-lvm}

# LibreNMS configuration
echo ""
echo -e "${CYAN}LibreNMS Configuration${NC}"
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

read -p "PortGrid web port [3000]: " PORTGRID_PORT
PORTGRID_PORT=${PORTGRID_PORT:-3000}

# ============================================
# Template Selection/Download
# ============================================

echo ""
echo -e "${YELLOW}Checking for Ubuntu template...${NC}"

# Look for Ubuntu templates
TEMPLATE_STORAGE="local"
TEMPLATE_DIR="/var/lib/vz/template/cache"

# List available Ubuntu templates
AVAILABLE_TEMPLATES=$(pveam available | grep -i ubuntu | grep -i "24.04\|22.04" | head -5)
if [ -z "$AVAILABLE_TEMPLATES" ]; then
    echo -e "${RED}No Ubuntu templates found in repository.${NC}"
    exit 1
fi

echo "Available Ubuntu templates:"
echo "$AVAILABLE_TEMPLATES" | nl -w2 -s") "

# Check for already downloaded templates
DOWNLOADED=$(pveam list $TEMPLATE_STORAGE 2>/dev/null | grep -i ubuntu | grep -i "24.04\|22.04" | awk '{print $1}' | head -1)

if [ -n "$DOWNLOADED" ]; then
    echo ""
    echo -e "${GREEN}Found downloaded template: $DOWNLOADED${NC}"
    read -p "Use this template? [Y/n]: " USE_DOWNLOADED
    USE_DOWNLOADED=${USE_DOWNLOADED:-Y}
    if [[ "${USE_DOWNLOADED,,}" != "n" ]]; then
        TEMPLATE="$TEMPLATE_STORAGE:vztmpl/$DOWNLOADED"
    fi
fi

if [ -z "$TEMPLATE" ]; then
    # Download a template
    echo ""
    echo -e "${YELLOW}Downloading Ubuntu 24.04 template...${NC}"
    TEMPLATE_NAME=$(pveam available | grep -i "ubuntu-24.04-standard" | awk '{print $2}' | head -1)
    if [ -z "$TEMPLATE_NAME" ]; then
        TEMPLATE_NAME=$(pveam available | grep -i "ubuntu-22.04-standard" | awk '{print $2}' | head -1)
    fi

    if [ -z "$TEMPLATE_NAME" ]; then
        echo -e "${RED}Error: Could not find Ubuntu template to download.${NC}"
        exit 1
    fi

    echo "Downloading $TEMPLATE_NAME..."
    pveam download $TEMPLATE_STORAGE $TEMPLATE_NAME
    TEMPLATE="$TEMPLATE_STORAGE:vztmpl/$TEMPLATE_NAME"
fi

# ============================================
# Create Container
# ============================================

echo ""
echo -e "${YELLOW}Creating LXC container...${NC}"
echo -e "  CT ID: ${CYAN}$CTID${NC}"
echo -e "  Hostname: ${CYAN}$CT_HOSTNAME${NC}"
echo -e "  Memory: ${CYAN}${CT_MEMORY}MB${NC}"
echo -e "  Disk: ${CYAN}${CT_DISK}GB${NC}"
echo -e "  Cores: ${CYAN}$CT_CORES${NC}"
echo -e "  Template: ${CYAN}$TEMPLATE${NC}"
echo ""

# Generate random password for container
CT_PASSWORD=$(openssl rand -base64 12)

# Create the container
pct create "$CTID" "$TEMPLATE" \
    --hostname "$CT_HOSTNAME" \
    --memory "$CT_MEMORY" \
    --cores "$CT_CORES" \
    --rootfs "$CT_STORAGE:$CT_DISK" \
    --net0 "$NET_CONFIG" \
    --unprivileged 1 \
    --features nesting=1 \
    --password "$CT_PASSWORD" \
    --start 0

echo -e "${GREEN}Container created successfully!${NC}"

# ============================================
# Start Container and Install PortGrid
# ============================================

echo ""
echo -e "${YELLOW}Starting container...${NC}"
pct start "$CTID"

# Wait for container to be ready
echo -e "${YELLOW}Waiting for container to initialize...${NC}"
sleep 10

# Wait for network
for i in {1..30}; do
    if pct exec "$CTID" -- ping -c 1 8.8.8.8 &>/dev/null; then
        echo -e "${GREEN}Network is up!${NC}"
        break
    fi
    echo "Waiting for network... ($i/30)"
    sleep 2
done

# ============================================
# Install Dependencies Inside Container
# ============================================

echo ""
echo -e "${YELLOW}Installing dependencies inside container...${NC}"

# Update and install base packages
pct exec "$CTID" -- bash -c "apt-get update && apt-get upgrade -y"
pct exec "$CTID" -- bash -c "apt-get install -y curl git ca-certificates gnupg"

# Install Node.js 20
echo -e "${YELLOW}Installing Node.js 20...${NC}"
pct exec "$CTID" -- bash -c "mkdir -p /etc/apt/keyrings"
pct exec "$CTID" -- bash -c "curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg"
pct exec "$CTID" -- bash -c "echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main' > /etc/apt/sources.list.d/nodesource.list"
pct exec "$CTID" -- bash -c "apt-get update && apt-get install -y nodejs"

# Verify Node.js installation
pct exec "$CTID" -- bash -c "node --version && npm --version"

# ============================================
# Clone and Setup PortGrid
# ============================================

echo ""
echo -e "${YELLOW}Cloning PortGrid from GitHub...${NC}"
pct exec "$CTID" -- bash -c "git clone https://github.com/solomonneas/portgrid.git /opt/portgrid"

# Create environment file
echo -e "${YELLOW}Creating environment configuration...${NC}"
pct exec "$CTID" -- bash -c "cat > /opt/portgrid/.env.local << 'ENVEOF'
LIBRENMS_URL=$LIBRENMS_URL
LIBRENMS_API_TOKEN=$LIBRENMS_TOKEN
ENVEOF"

# Install dependencies
echo ""
echo -e "${YELLOW}Installing npm dependencies (this may take a few minutes)...${NC}"
pct exec "$CTID" -- bash -c "cd /opt/portgrid && npm install"

# Build the application
echo ""
echo -e "${YELLOW}Building PortGrid...${NC}"
pct exec "$CTID" -- bash -c "cd /opt/portgrid && npm run build"

# ============================================
# Create Systemd Service
# ============================================

echo ""
echo -e "${YELLOW}Creating systemd service...${NC}"

pct exec "$CTID" -- bash -c "cat > /etc/systemd/system/portgrid.service << 'SERVICEEOF'
[Unit]
Description=PortGrid - Network Port Visualization
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/portgrid
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$PORTGRID_PORT

[Install]
WantedBy=multi-user.target
SERVICEEOF"

# Enable and start service
pct exec "$CTID" -- bash -c "systemctl daemon-reload"
pct exec "$CTID" -- bash -c "systemctl enable portgrid"
pct exec "$CTID" -- bash -c "systemctl start portgrid"

# Wait for service to start
sleep 5

# ============================================
# Get Container IP
# ============================================

CT_IP_ADDR=$(pct exec "$CTID" -- bash -c "hostname -I | awk '{print \$1}'" 2>/dev/null || echo "unknown")

# ============================================
# Final Summary
# ============================================

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}     PortGrid Installation Complete!            ${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Container Details:"
echo -e "  ${CYAN}CT ID:${NC}        $CTID"
echo -e "  ${CYAN}Hostname:${NC}     $CT_HOSTNAME"
echo -e "  ${CYAN}IP Address:${NC}   $CT_IP_ADDR"
echo -e "  ${CYAN}Root Password:${NC} $CT_PASSWORD"
echo ""
echo -e "PortGrid Access:"
echo -e "  ${BLUE}http://$CT_IP_ADDR:$PORTGRID_PORT${NC}"
echo ""
echo -e "Useful Commands:"
echo -e "  ${YELLOW}pct enter $CTID${NC}                    - Enter container shell"
echo -e "  ${YELLOW}pct exec $CTID -- systemctl status portgrid${NC}"
echo -e "  ${YELLOW}pct exec $CTID -- journalctl -u portgrid -f${NC}"
echo ""
echo -e "${CYAN}Save the root password above - you'll need it to log in!${NC}"
echo ""

# Check if service is running
if pct exec "$CTID" -- systemctl is-active --quiet portgrid 2>/dev/null; then
    echo -e "${GREEN}✓ PortGrid service is running!${NC}"
else
    echo -e "${YELLOW}⚠ Service may still be starting. Check status with:${NC}"
    echo -e "  pct exec $CTID -- systemctl status portgrid"
fi
