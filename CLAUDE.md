# PortGrid - Project Context

## Quick Start
```bash
# Development
cd C:\Users\srnea\Code\portgrid
cp .env.local.example .env.local
# Edit .env.local with your data source config (LibreNMS or NetDisco)
npm run dev

# Production build
npm run build
npm start
```

## Recent Session Summary
**Date:** 2026-01-21
**Focus:** Added NetDisco support with multi-backend adapter pattern

### Completed This Session
- Implemented adapter pattern for multiple data sources (`lib/adapters/`)
- Created `LibreNMSAdapter` class extracting logic from route.ts (`lib/adapters/librenms.ts`)
- Created `NetDiscoAdapter` class with batched parallel API calls (`lib/adapters/netdisco.ts`)
- Added factory function `createDataSourceAdapter()` (`lib/adapters/index.ts`)
- Simplified API route to 17 lines using adapter pattern (`app/api/ports/route.ts`)
- Added NetDisco types and `DataSourceAdapter` interface (`types/port.ts`)
- Updated environment config with `DATA_SOURCE` variable (`.env.local.example`)
- Committed and pushed: `e42efc0` "Add NetDisco support with adapter pattern"

### Key Decisions Made
- **Adapter pattern** - Clean separation allows easy addition of future backends
- **Batched parallel requests for NetDisco** - 5 devices at a time to balance speed vs. API load
- **`Promise.allSettled` for resilience** - Individual device failures don't break the entire fetch
- **IP-to-numeric hash for device_id** - NetDisco uses IPs; converted to numeric for consistency

### Current State
- Multi-backend support complete and working
- Build passes, lint shows only expected TanStack Table warning
- LibreNMS remains default backend for backward compatibility
- NetDisco adapter untested against live instance (needs user verification)

### Next Steps
- [ ] Test NetDisco adapter against a live NetDisco instance
- [ ] Consider adding port statistics/graphs
- [ ] Consider adding backend indicator in UI (show which data source is active)

## Architecture Notes

### Key Files
- `lib/adapters/index.ts` - Factory function that creates appropriate adapter
- `lib/adapters/librenms.ts` - LibreNMS data source adapter
- `lib/adapters/netdisco.ts` - NetDisco data source adapter
- `app/api/ports/route.ts` - Simplified API route using adapter factory
- `app/page.tsx` - Main page with search/filter state management
- `components/switch-accordion.tsx` - Device grouping with port counts
- `components/port-grid-table.tsx` - TanStack Table with sorting/pagination
- `components/columns.tsx` - Column definitions with status badges
- `types/port.ts` - TypeScript interfaces for API data + adapter interface
- `hooks/use-ports.ts` - TanStack Query hook
- `scripts/proxmox_install.sh` - Proxmox host-level LXC container installer
- `scripts/install_portgrid.sh` - Linux service installer (inside existing environment)

### Data Flow
1. `usePorts()` hook fetches `/api/ports`
2. API route calls `createDataSourceAdapter()` based on `DATA_SOURCE` env var
3. Adapter fetches from LibreNMS or NetDisco and normalizes to `DeviceWithPorts[]`
4. Client-side filtering by search term and VLAN

### Environment Variables
```env
# Data source: librenms (default) or netdisco
DATA_SOURCE=librenms

# LibreNMS (required if DATA_SOURCE=librenms)
LIBRENMS_URL=https://your-librenms-instance.com
LIBRENMS_API_TOKEN=your-api-token-here

# NetDisco (required if DATA_SOURCE=netdisco)
NETDISCO_URL=https://your-netdisco-instance.com
NETDISCO_API_KEY=your-api-key-here
```

### NetDisco API Endpoints Used
- `GET /api/v1/search/device` - List all devices
- `GET /api/v1/object/device/{ip}/ports` - Ports per device
- `GET /api/v1/object/device/{ip}/neighbors` - Neighbors per device

## Gotchas & Lessons Learned
- **React Compiler + next-themes**: Using `useEffect` to set mounted state triggers lint error. Fixed by using CSS-based icon switching with `dark:` classes instead.
- **TanStack Table warning**: The `useReactTable` hook returns functions that can't be memoized - this is expected and safe to ignore.
- **NetDisco requires per-device calls**: Unlike LibreNMS bulk endpoints, NetDisco needs individual API calls per device for ports/neighbors.

---

## Previous Sessions

### 2026-01-21 (Earlier) - Initial Implementation
**Focus:** Initial implementation of PortGrid - a network switch port visualization tool for LibreNMS

**Completed:**
- Created Next.js 15 project with TypeScript, Tailwind CSS v4, and Shadcn/UI
- Implemented LibreNMS API proxy that fetches ports, devices, and LLDP/CDP links
- Built accordion-based UI grouped by switch device
- Created port table with color-coded rows (green=up, red=admin up/oper down, gray=disabled)
- Added global search and VLAN dropdown filter
- Implemented dark/light mode toggle
- Created Proxmox installer script and README
- Pushed to GitHub: https://github.com/solomonneas/portgrid
