# PortGrid

A network switch port visualization tool for LibreNMS. View all your switch ports in a clean, searchable interface with real-time status updates.

![PortGrid Screenshot](docs/screenshot.png)

## Features

- **Real-time port status** - Color-coded indicators (green=up, red=down, gray=disabled)
- **Grouped by switch** - Accordion layout organized by device
- **Global search** - Search across all ports, descriptions, and MAC addresses
- **VLAN filtering** - Filter ports by VLAN assignment
- **LLDP/CDP neighbor info** - See connected device information
- **Auto-refresh** - Updates every 60 seconds
- **Dark/Light mode** - Toggle between themes
- **Responsive design** - Works on desktop and mobile

## Quick Start

### Prerequisites

- A LibreNMS instance with API access enabled
- Node.js 18+ (for manual installation)
- OR a Proxmox host (for automated LXC deployment)

### Option 1: Proxmox LXC Container (Recommended)

The easiest way to deploy PortGrid is using our Proxmox installer script. Run this **on your Proxmox host**:

```bash
# Download and run the installer
curl -fsSL https://raw.githubusercontent.com/solomonneas/portgrid/main/scripts/proxmox_install.sh -o proxmox_install.sh
chmod +x proxmox_install.sh
./proxmox_install.sh
```

The script will:
1. Find the next available container ID
2. Download an Ubuntu template (if needed)
3. Create and configure an LXC container
4. Install Node.js 20
5. Clone and build PortGrid
6. Configure a systemd service
7. Prompt you for LibreNMS URL and API token

### Option 2: Manual Installation

#### 1. Clone the repository

```bash
git clone https://github.com/solomonneas/portgrid.git
cd portgrid
```

#### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your LibreNMS details:

```env
LIBRENMS_URL=https://your-librenms-instance.com
LIBRENMS_API_TOKEN=your-api-token-here
```

#### 3. Install and build

```bash
npm install
npm run build
```

#### 4. Run

```bash
# Production
npm start

# Development (with hot reload)
npm run dev
```

### Option 3: Linux Service Installation

If you already have a Linux server with Node.js installed:

```bash
git clone https://github.com/solomonneas/portgrid.git
cd portgrid
sudo ./scripts/install_portgrid.sh
```

## Getting a LibreNMS API Token

1. Log in to your LibreNMS instance
2. Go to **Settings** > **API** > **API Settings**
3. Click **Create API access token**
4. Give it a description (e.g., "PortGrid")
5. Copy the generated token

## Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `LIBRENMS_URL` | Your LibreNMS instance URL | Required |
| `LIBRENMS_API_TOKEN` | LibreNMS API token | Required |
| `PORT` | Port to run PortGrid on | 3000 |

## Management Commands

### Proxmox Container

```bash
# Enter container shell
pct enter <CTID>

# Check service status
pct exec <CTID> -- systemctl status portgrid

# View logs
pct exec <CTID> -- journalctl -u portgrid -f

# Restart service
pct exec <CTID> -- systemctl restart portgrid
```

### Systemd Service

```bash
# Check status
systemctl status portgrid

# View logs
journalctl -u portgrid -f

# Restart
systemctl restart portgrid

# Stop
systemctl stop portgrid
```

## Updating PortGrid

### Proxmox Container

```bash
pct exec <CTID> -- bash -c "cd /opt/portgrid && git pull && npm install && npm run build && systemctl restart portgrid"
```

### Manual Installation

```bash
cd /opt/portgrid  # or your installation directory
git pull
npm install
npm run build
systemctl restart portgrid
```

## Architecture

```
portgrid/
├── app/
│   ├── api/ports/route.ts    # LibreNMS API proxy
│   └── page.tsx              # Main page
├── components/
│   ├── switch-accordion.tsx  # Device grouping
│   ├── port-grid-table.tsx   # Port table with sorting
│   └── columns.tsx           # Column definitions
├── hooks/
│   └── use-ports.ts          # TanStack Query hook
├── types/
│   └── port.ts               # TypeScript interfaces
└── scripts/
    ├── proxmox_install.sh    # Proxmox LXC installer
    └── install_portgrid.sh   # Linux service installer
```

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Tailwind CSS v4 + Shadcn/UI
- **Data Fetching**: TanStack Query
- **Tables**: TanStack Table
- **Language**: TypeScript

## Troubleshooting

### "Failed to fetch ports"

1. Verify your LibreNMS URL is correct and accessible
2. Check your API token is valid
3. Ensure your LibreNMS instance allows API access from the PortGrid server

### Container won't start

```bash
# Check container status
pct status <CTID>

# View container console
pct console <CTID>
```

### Service won't start

```bash
# Check for errors
journalctl -u portgrid -n 50

# Verify Node.js is installed
node --version

# Try running manually
cd /opt/portgrid
npm start
```

## License

MIT

## Credits

Inspired by [SwitchMap-NG](https://github.com/pnnl/switchmap-ng) for LibreNMS.
