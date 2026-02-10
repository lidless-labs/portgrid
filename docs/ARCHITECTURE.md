# Architecture

## System Overview

PortGrid is a Next.js application that connects to LibreNMS via REST API to visualize network switch ports in high-density grid format. The frontend fetches device and port data, caches it locally, and provides real-time status indicators with drill-down capability.

## Tech Stack

### Frontend
- **Next.js 15** with App Router for React server and client components
- **React 19** for interactive UI
- **TypeScript 5** for type safety
- **Tailwind CSS 4** for styling
- **Zustand** for client-side state management
- **TanStack Query** for server state and caching
- Runs on **port 5184**

### Backend Integration
- **LibreNMS REST API** as the single source of truth for port data
- No separate backend; uses Next.js API routes as thin proxy layer
- API token stored server-side (in API route handler environment)

## Data Flow

```
User Loads Dashboard
    |
    v
Query LibreNMS for Device List
    |
    v
Cache Devices in localStorage + Zustand
    |
    v
For Each Device, Fetch Port Status
    |
    v
Cache Port Data with TanStack Query
    |
    v
Render Grid (color-coded by status)
    |
    v
User Searches or Filters
    |
    v
Filter Cached Data (instant)
    |
    v
Auto-refresh every 60 seconds
    |
    v
Poll /api/ports for updates
    |
    v
Update cache and re-render (smart diff)
```

## State Management

### Zustand Store

Manages UI state (filters, grouping, theme):

```typescript
interface PortGridStore {
  // Grouping
  deviceGroups: Map<string, string[]>;  // groupId -> deviceIds
  createGroup: (name: string) => void;
  addDeviceToGroup: (groupId: string, deviceId: string) => void;
  deleteGroup: (groupId: string) => void;
  renameGroup: (groupId: string, newName: string) => void;
  
  // Filters
  selectedVlans: Set<number>;
  searchTerm: string;
  setSearch: (term: string) => void;
  toggleVlan: (vlanId: number) => void;
  
  // UI
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  expandedDevices: Set<string>;
  toggleExpanded: (deviceId: string) => void;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// Persisted to localStorage under key: portgrid-ui-v1
```

### TanStack Query (Server State)

Manages server data caching and synchronization:

```typescript
// Devices query
const { data: devices } = useQuery({
  queryKey: ['librenms', 'devices'],
  queryFn: fetchDevices,
  staleTime: 60000,  // Cache for 60 seconds
  refetchInterval: 60000,
});

// Ports query per device
const { data: ports } = useQuery({
  queryKey: ['librenms', 'ports', deviceId],
  queryFn: () => fetchPorts(deviceId),
  staleTime: 30000,
  refetchInterval: 60000,
});

// Combined query for efficient multi-device updates
const { data: allPorts } = useQuery({
  queryKey: ['librenms', 'all-ports'],
  queryFn: fetchAllPorts,
  staleTime: 30000,
  refetchInterval: 60000,
});
```

## Data Models

### Device

```typescript
interface Device {
  device_id: number;
  hostname: string;
  ip: string;
  sysDescr: string;
  device_type: string;
  os: string;
  uptime: number;
  last_polled: string;
  disabled: number;  // 0 = enabled, 1 = disabled
  ports_count: number;
}
```

### Port

```typescript
interface Port {
  port_id: number;
  device_id: number;
  ifIndex: number;
  ifName: string;
  ifAlias: string;
  ifType: string;
  ifMtu: number;
  ifSpeed: number;
  ifAdminStatus: 'up' | 'down';  // Configured state
  ifOperStatus: 'up' | 'down';   // Current state
  ifPhysAddress: string;         // MAC address
  ifLastChange: number;
  ifInOctets: number;
  ifOutOctets: number;
  vlans: Vlan[];
  neighbors: Neighbor[];
}

interface Vlan {
  vlan_id: number;
  vlan_name: string;
  baseIndex: number;
}

interface Neighbor {
  hostname: string;
  port: string;
  protocol: 'lldp' | 'cdp';
}
```

## API Endpoints

### Next.js API Routes (Proxy to LibreNMS)

**GET /api/devices**
Fetch all devices.

```javascript
// Internal implementation
async function GET(req) {
  const response = await fetch(
    `${LIBRENMS_HOST}/api/v0/devices`,
    {
      headers: { 'X-Auth-Token': LIBRENMS_API_TOKEN }
    }
  );
  return response.json();
}
```

**GET /api/ports?device_id={id}**
Fetch ports for a device.

```javascript
async function GET(req) {
  const deviceId = req.nextUrl.searchParams.get('device_id');
  const response = await fetch(
    `${LIBRENMS_HOST}/api/v0/devices/${deviceId}/ports`,
    { headers: { 'X-Auth-Token': LIBRENMS_API_TOKEN } }
  );
  
  // Return with status mapping and caching headers
  return {
    statusCode: 200,
    headers: {
      'Cache-Control': 'max-age=30',
    },
    body: await response.json(),
  };
}
```

**GET /api/ports/all**
Fetch all ports across all devices (optimized batch).

Uses LibreNMS `/api/v0/ports?columns=*&limit=0` for efficient multi-device fetch.

## Component Architecture

```
Layout (theme provider, auth guard)
  |
  +-- Header
  |   +-- Search Bar
  |   +-- Theme Toggle
  |   +-- Help
  |
  +-- Main Content
  |   +-- Sidebar
  |   |   +-- DeviceList / GroupedDevices
  |   |   +-- VlanFilter
  |   |   +-- Statistics
  |   |
  |   +-- Canvas
  |       +-- DeviceGroup / ExpandableDevice
  |           +-- PortGrid (48 ports per page)
  |               +-- PortCard (status indicator)
  |                   +-- Popover (details on hover)
```

### Key Components

**PortGrid**
Renders grid of port cards with color coding.

```typescript
function PortGrid({ device, ports, selectedVlans, searchTerm }) {
  const filtered = ports
    .filter(p => selectedVlans.size === 0 || p.vlans.some(v => selectedVlans.has(v.vlan_id)))
    .filter(p => matches(p, searchTerm))
    .slice(0, 48);  // Pagination
  
  return (
    <div className="grid grid-cols-12 gap-1">
      {filtered.map(port => (
        <PortCard key={port.port_id} port={port} />
      ))}
    </div>
  );
}
```

**PortCard**
Individual port with status color and hover details.

```typescript
function PortCard({ port }) {
  const statusColor = {
    'up': 'bg-green-500',
    'down': 'bg-amber-500',
    'disabled': 'bg-red-500',
  };
  
  const bgClass = statusColor[port.ifOperStatus] || 'bg-gray-500';
  
  return (
    <div className={`${bgClass} rounded p-1 text-xs cursor-pointer group`}>
      {port.ifName}
      <Popover>
        <PortDetails port={port} />
      </Popover>
    </div>
  );
}
```

**DeviceGroup**
Collapsible group of devices for organization.

```typescript
function DeviceGroup({ groupName, devices, onRename, onUngroup }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <details open={expanded}>
      <summary onClick={() => setExpanded(!expanded)}>
        {groupName} ({devices.length} switches)
      </summary>
      {expanded && devices.map(device => (
        <Device key={device.device_id} device={device} />
      ))}
    </details>
  );
}
```

## Search Implementation

Instant client-side search across cached port data:

```typescript
function searchPorts(ports, term) {
  return ports.filter(port => {
    const lower = term.toLowerCase();
    return (
      port.ifName.toLowerCase().includes(lower) ||
      port.ifAlias.toLowerCase().includes(lower) ||
      port.ifPhysAddress.toLowerCase().includes(lower) ||
      port.vlans.some(v => v.vlan_name.toLowerCase().includes(lower))
    );
  });
}
```

Indexed with `useMemo` to avoid re-computation on every render.

## Caching Strategy

```
Request Flow:
1. Component mounts
2. TanStack Query checks cache (30-60s TTL)
3. If fresh, use cached data (instant)
4. If stale, fetch from API in background
5. On refetch interval (60s), fetch updates
6. Diff new data with cached data
7. Update only changed ports in UI
```

## VLAN Filtering

Ports can belong to multiple VLANs. Filtering logic:

```typescript
function matchesVlanFilter(port, selectedVlans) {
  if (selectedVlans.size === 0) return true;  // Show all if no filter
  return port.vlans.some(v => selectedVlans.has(v.vlan_id));
}
```

Display port in grid if ANY of its VLANs is selected.

## Responsive Design

Grid adapts to viewport:

```css
/* Desktop: 12-column grid, 48 ports per device */
@media (min-width: 1920px) {
  grid-template-columns: repeat(12, 1fr);
}

/* Tablet: 8-column grid, 32 ports per device */
@media (min-width: 1024px) {
  grid-template-columns: repeat(8, 1fr);
}

/* Mobile: 6-column grid, 18 ports per device */
@media (min-width: 640px) {
  grid-template-columns: repeat(6, 1fr);
}
```

## Performance Characteristics

- **Device List Load:** <500ms (API call + cache)
- **Port Grid Render:** <200ms for 48 ports (virtualized)
- **Search:** <50ms (indexed)
- **Auto-refresh:** 60 seconds (configurable)
- **Memory Usage:** ~50MB for 1000+ ports (normal)

## Offline Capability

Limited offline support:
1. Cached device list from previous session
2. Previously fetched port data available
3. New data cannot be fetched without internet
4. Search and filter work on cached data

For full offline capability, export port data to JSON and use local copy.
