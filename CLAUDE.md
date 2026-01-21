# PortGrid - Project Context

## Quick Start
```bash
# Development
cd C:\Users\srnea\Code\portgrid
cp .env.local.example .env.local
# Edit .env.local with your LibreNMS URL and API token
npm run dev

# Production build
npm run build
npm start
```

## Recent Session Summary
**Date:** 2026-01-21
**Focus:** Initial implementation of PortGrid - a network switch port visualization tool for LibreNMS

### Completed This Session
- Created Next.js 15 project with TypeScript, Tailwind CSS v4, and Shadcn/UI
- Implemented LibreNMS API proxy (`app/api/ports/route.ts`) that fetches ports, devices, and LLDP/CDP links
- Built accordion-based UI grouped by switch device (`components/switch-accordion.tsx`)
- Created port table with color-coded rows (`components/port-grid-table.tsx`):
  - Green: port up
  - Red: admin up but oper down
  - Gray: admin down (disabled)
- Added global search and VLAN dropdown filter
- Implemented dark/light mode toggle
- Created basic Linux installer script (`scripts/install_portgrid.sh`)
- Pushed to GitHub: https://github.com/solomonneas/portgrid

### Key Decisions Made
- **Accordion layout** - Matches SwitchMap's grouped-by-switch approach
- **TanStack Query** - Auto-refresh every 60 seconds, 1-minute stale time
- **No authentication** - Trusted network; LibreNMS API token is sole security
- **50 ports per page** - Pagination within each switch accordion

### Current State
- Core application is complete and builds successfully
- Lint passes (1 warning about TanStack Table is expected)
- Ready for deployment but installer only works inside existing Linux environment

### Next Steps
- [x] **Create Proxmox host-level installer** (`scripts/proxmox_install.sh`) that:
  - Finds next available CT ID
  - Creates Ubuntu LXC container
  - Installs Node.js 20 inside the container
  - Clones PortGrid from GitHub
  - Configures systemd service
  - Prompts for LibreNMS URL and API token
- [x] Add README.md with setup instructions
- [ ] Consider adding port statistics/graphs

## Architecture Notes

### Key Files
- `app/api/ports/route.ts` - LibreNMS API proxy, joins ports + devices + links
- `app/page.tsx` - Main page with search/filter state management
- `components/switch-accordion.tsx` - Device grouping with port counts
- `components/port-grid-table.tsx` - TanStack Table with sorting/pagination
- `components/columns.tsx` - Column definitions with status badges
- `types/port.ts` - TypeScript interfaces for API data
- `hooks/use-ports.ts` - TanStack Query hook
- `scripts/proxmox_install.sh` - Proxmox host-level LXC container installer
- `scripts/install_portgrid.sh` - Linux service installer (inside existing environment)

### Data Flow
1. `usePorts()` hook fetches `/api/ports`
2. API route fetches from LibreNMS: `/api/v0/ports`, `/api/v0/devices`, `/api/v0/links`
3. Data is joined and grouped by device_id
4. Client-side filtering by search term and VLAN

### Environment Variables
```env
LIBRENMS_URL=https://your-librenms-instance.com
LIBRENMS_API_TOKEN=your-api-token-here
```

## Gotchas & Lessons Learned
- **React Compiler + next-themes**: Using `useEffect` to set mounted state triggers lint error. Fixed by using CSS-based icon switching with `dark:` classes instead.
- **TanStack Table warning**: The `useReactTable` hook returns functions that can't be memoized - this is expected and safe to ignore.
