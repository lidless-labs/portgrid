<p align="center">
  <img src="docs/logo.svg" alt="PortGrid" width="280">
</p>

<p align="center">
  <strong>Network port visualization dashboard for LibreNMS</strong><br>
  <sub>View all your switch ports in a clean, searchable interface with real-time status updates</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
</p>

---

## Features

| Feature | Description |
|---------|-------------|
| 🟢 **Real-time status** | Color-coded indicators - green=up, amber=inactive, red=disabled |
| 📁 **Grouped by switch** | Accordion layout organized by device with drag-to-combine grouping |
| 🔍 **Global search** | Search across all ports, descriptions, and MAC addresses |
| 🏷️ **VLAN filtering** | Filter ports by VLAN assignment |
| 🔗 **LLDP/CDP neighbors** | See connected device information |
| ♻️ **Auto-refresh** | Updates every 60 seconds |
| 🌙 **Dark/Light mode** | Toggle between themes |
| 📱 **Responsive** | Works on desktop and mobile |

---

## Usage

### Grouping Devices

Organize related switches into custom groups using drag-and-drop:

1. **Create a group** - Drag one device onto another to combine them into a new group
2. **Add to existing group** - Drag additional devices into a group to add them
3. **Rename groups** - Click the group name to edit it
4. **Remove from group** - Drag a device out of the group back to the main list

Groups are saved to your browser's localStorage and persist across sessions.

---

## Quick Start

### Prerequisites

- A LibreNMS instance with API access enabled
- Node.js 18+ (for manual installation)
- OR a Proxmox host (for automated LXC deployment)

### Option 1: Proxmox LXC Container (Recommended)

Run this **on your Proxmox host**:

```bash
curl -fsSL https://raw.githubusercontent.com/solomonneas/portgrid/main/scripts/proxmox_install.sh -o proxmox_install.sh
chmod +x proxmox_install.sh
./proxmox_install.sh
```

The script will automatically:
- Create an LXC container with Ubuntu
- Install Node.js 20 and build PortGrid
- Configure a systemd service
- Prompt you for LibreNMS credentials

### Option 2: Manual Installation

```bash
# Clone and enter directory
git clone https://github.com/solomonneas/portgrid.git
cd portgrid

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your LibreNMS URL and API token

# Install and build
npm install
npm run build

# Run
npm start
```

### Option 3: Linux Service

```bash
git clone https://github.com/solomonneas/portgrid.git
cd portgrid
sudo ./scripts/install_portgrid.sh
```

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LIBRENMS_URL` | Your LibreNMS instance URL | ✓ |
| `LIBRENMS_API_TOKEN` | LibreNMS API token | ✓ |
| `PORT` | Port to run PortGrid on | Default: 3000 |
| `DEVICE_EXCLUDE` | Glob patterns to exclude devices | Optional |
| `DEVICE_INCLUDE` | Glob patterns to include (whitelist mode) | Optional |

### Getting a LibreNMS API Token

1. Log in to LibreNMS → **Settings** → **API** → **API Settings**
2. Click **Create API access token**
3. Copy the generated token

---

## Management

<details>
<summary><strong>Proxmox Container Commands</strong></summary>

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

</details>

<details>
<summary><strong>Systemd Service Commands</strong></summary>

```bash
systemctl status portgrid    # Check status
journalctl -u portgrid -f    # View logs
systemctl restart portgrid   # Restart
systemctl stop portgrid      # Stop
```

</details>

<details>
<summary><strong>Updating PortGrid</strong></summary>

```bash
# Proxmox
pct exec <CTID> -- bash -c "cd /opt/portgrid && git pull && npm install && npm run build && systemctl restart portgrid"

# Manual
cd /opt/portgrid && git pull && npm install && npm run build && systemctl restart portgrid
```

</details>

---

## Architecture

```
portgrid/
├── app/
│   ├── api/ports/route.ts    # LibreNMS API proxy
│   └── page.tsx              # Main page with header/filters
├── components/
│   ├── switch-accordion.tsx  # Device list with drag-and-drop
│   ├── port-grid-table.tsx   # Port table with sorting
│   └── columns.tsx           # Column definitions
├── hooks/
│   ├── use-ports.ts          # TanStack Query for port data
│   └── use-port-notes.ts     # localStorage for port notes
├── lib/adapters/
│   └── librenms.ts           # LibreNMS API adapter
└── scripts/
    ├── proxmox_install.sh    # Proxmox LXC installer
    └── install_portgrid.sh   # Linux service installer
```

---

## Troubleshooting

<details>
<summary><strong>"Failed to fetch ports"</strong></summary>

1. Verify your LibreNMS URL is correct and accessible
2. Check your API token is valid
3. Ensure LibreNMS allows API access from the PortGrid server

</details>

<details>
<summary><strong>Container won't start</strong></summary>

```bash
pct status <CTID>      # Check container status
pct console <CTID>     # View container console
```

</details>

<details>
<summary><strong>Service won't start</strong></summary>

```bash
journalctl -u portgrid -n 50    # Check for errors
node --version                   # Verify Node.js
cd /opt/portgrid && npm start   # Try running manually
```

</details>

---

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **UI:** Tailwind CSS v4 + Shadcn/UI
- **Data:** TanStack Query + TanStack Table
- **Language:** TypeScript

---

## License

MIT

---

<p align="center">
  Inspired by <a href="https://sourceforge.net/projects/switchmap/">SwitchMap</a>
</p>
