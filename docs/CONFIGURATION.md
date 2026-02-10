# Configuration

## LibreNMS Connection

### Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_LIBRENMS_HOST=https://librenms.example.com
LIBRENMS_API_TOKEN=your-api-token-here
NEXT_PUBLIC_REFRESH_INTERVAL=60000
NEXT_PUBLIC_PORT_PAGE_SIZE=48
NEXT_PUBLIC_GRID_COLUMNS=12
NEXT_PUBLIC_TIMEOUT_MS=10000
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_LIBRENMS_HOST` | LibreNMS server URL (HTTPS recommended) | (required) |
| `LIBRENMS_API_TOKEN` | LibreNMS API token (keep secret) | (required) |
| `NEXT_PUBLIC_REFRESH_INTERVAL` | Auto-refresh interval in milliseconds | 60000 |
| `NEXT_PUBLIC_PORT_PAGE_SIZE` | Ports displayed per device | 48 |
| `NEXT_PUBLIC_GRID_COLUMNS` | Grid columns (adjust for resolution) | 12 |
| `NEXT_PUBLIC_TIMEOUT_MS` | API request timeout | 10000 |

### Getting LibreNMS API Token

1. Log in to LibreNMS web interface
2. Navigate to **Settings > API**
3. Click **Create API Token**
4. Copy token to `.env.local`
5. Restart dev server

### Verifying API Connection

Test LibreNMS connectivity:

```bash
curl -X GET \
  "https://librenms.example.com/api/v0/devices" \
  -H "X-Auth-Token: your-api-token" \
  -H "Content-Type: application/json"
```

You should receive a JSON response with your monitored devices.

## Running the Application

### Development

```bash
npm install
npm run dev
```

Starts on `http://localhost:5184`

Hot reload enabled. Changes to components and styles are instant.

### Production Build

```bash
npm run build
npm run start
```

Or deploy as serverless function (Vercel, Netlify, etc.):

```bash
npm run build
# Deploy dist/ or .next/ directory
```

## Appearance Configuration

### Grid Layout

Adjust grid columns based on your monitor resolution:

```bash
# Ultra-wide (5120x): 16 columns
NEXT_PUBLIC_GRID_COLUMNS=16

# 4K (3840x2160): 14 columns
NEXT_PUBLIC_GRID_COLUMNS=14

# 1440p (2560x1440): 12 columns (default)
NEXT_PUBLIC_GRID_COLUMNS=12

# 1080p (1920x1080): 10 columns
NEXT_PUBLIC_GRID_COLUMNS=10
```

### Port Page Size

Control how many ports display per device:

```bash
# Show all ports on one "page"
NEXT_PUBLIC_PORT_PAGE_SIZE=0

# Show 32 ports per device (good for dense grids)
NEXT_PUBLIC_PORT_PAGE_SIZE=32

# Show 48 ports per device (default, balanced)
NEXT_PUBLIC_PORT_PAGE_SIZE=48

# Show 64 ports per device (full cabinet)
NEXT_PUBLIC_PORT_PAGE_SIZE=64
```

### Refresh Interval

How often to poll LibreNMS for updates:

```bash
# Every 30 seconds (more responsive, higher load)
NEXT_PUBLIC_REFRESH_INTERVAL=30000

# Every 60 seconds (default, balanced)
NEXT_PUBLIC_REFRESH_INTERVAL=60000

# Every 2 minutes (less load, slower updates)
NEXT_PUBLIC_REFRESH_INTERVAL=120000

# Disable auto-refresh (manual refresh only)
NEXT_PUBLIC_REFRESH_INTERVAL=0
```

## Device Grouping

Groups are saved to browser localStorage:

| Key | Purpose |
|-----|---------|
| `portgrid-ui-v1` | UI state (groups, filters, theme) |
| `portgrid-cache-v1` | Cached device/port data |

### Creating a Group

1. Drag one device card onto another
2. Confirm group name in dialog
3. Group is saved to localStorage automatically

### Bulk Device Management

To group devices programmatically:

```javascript
// In browser console
const store = usePortGridStore.getState();
store.createGroup('Core Switches');
store.addDeviceToGroup('Core Switches', 5);
store.addDeviceToGroup('Core Switches', 6);
store.addDeviceToGroup('Core Switches', 7);
```

### Persistent Groups

Groups persist across browser sessions. To reset:

```javascript
localStorage.removeItem('portgrid-ui-v1');
location.reload();
```

## Filtering and Search

### VLAN Filtering

Filter displayed ports by VLAN:

1. Click **VLANs** in sidebar
2. Check VLANs to display
3. Grid updates instantly
4. Filter state is saved to localStorage

### Global Search

Press `Ctrl+K` to open search. Search by:
- **Port name** - "Eth0", "Gi0/0/1"
- **Description** - "Server uplink", "Printer"
- **MAC address** - "aa:bb:cc:dd:ee:ff"
- **VLAN** - "vlan 100", "VLAN 10"

Search results update instantly from cached data. No network calls.

## Performance Tuning

### For Large Deployments (1000+ ports)

1. Increase page size:
   ```bash
   NEXT_PUBLIC_PORT_PAGE_SIZE=96
   ```

2. Increase refresh interval:
   ```bash
   NEXT_PUBLIC_REFRESH_INTERVAL=120000  # 2 minutes
   ```

3. Use grouping to organize devices:
   - Group by building, floor, or function
   - Collapse non-essential groups

### For Limited Bandwidth

1. Disable auto-refresh and refresh manually:
   ```bash
   NEXT_PUBLIC_REFRESH_INTERVAL=0
   ```

2. Reduce grid columns:
   ```bash
   NEXT_PUBLIC_GRID_COLUMNS=8
   ```

3. Filter to specific VLANs instead of showing all

## API Configuration

### Request Timeout

Adjust timeout for slow networks:

```bash
# 5 seconds (fast networks)
NEXT_PUBLIC_TIMEOUT_MS=5000

# 10 seconds (default)
NEXT_PUBLIC_TIMEOUT_MS=10000

# 30 seconds (slow/high-latency networks)
NEXT_PUBLIC_TIMEOUT_MS=30000
```

### LibreNMS Query Limits

For large LibreNMS instances, you may need to adjust LibreNMS settings:

```bash
# In LibreNMS config.php
$config['poller_workers'] = 16;        # More poller processes
$config['db']['extension'] = 'mysqli'; # Use optimized driver
$config['api']['max_result_limit'] = 9999; # Increase API limit
```

## Keyboard Shortcuts

| Key | Action | Customizable |
|-----|--------|--------------|
| `Ctrl+K` / `Cmd+K` | Open search | No (built-in) |
| `Esc` | Close search | No (built-in) |
| `L` | Toggle light/dark theme | No (built-in) |
| `?` | Show help | No (built-in) |

To customize shortcuts, edit `lib/keyboard.ts`.

## Browser Storage

PortGrid uses localStorage for:

1. **UI State** - Groups, filters, theme preference (~100KB)
2. **Cache** - Device and port data (~5-50MB depending on deployment)

Monitor storage quota:

```javascript
navigator.storage.estimate().then(estimate => {
  const used = (estimate.usage / 1024 / 1024).toFixed(2);
  const quota = (estimate.quota / 1024 / 1024).toFixed(2);
  console.log(`Using ${used}MB of ${quota}MB`);
});
```

### Clear Cache

If experiencing performance issues:

```javascript
localStorage.removeItem('portgrid-cache-v1');
location.reload();
```

Cache will be rebuilt on next refresh.

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel env add NEXT_PUBLIC_LIBRENMS_HOST
vercel env add LIBRENMS_API_TOKEN
vercel deploy
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next ./.next
COPY public ./public
EXPOSE 3000
CMD ["npm", "run", "start"]
```

Build and run:

```bash
docker build -t portgrid .
docker run -p 5184:3000 \
  -e NEXT_PUBLIC_LIBRENMS_HOST=https://librenms.example.com \
  -e LIBRENMS_API_TOKEN=your-token \
  portgrid
```

### Self-Hosted (Nginx Proxy)

```nginx
server {
  listen 80;
  server_name portgrid.example.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Troubleshooting

### API Connection Failed

Check LibreNMS connectivity:

```bash
curl -I "https://librenms.example.com/api/v0/devices" \
  -H "X-Auth-Token: $LIBRENMS_API_TOKEN"
```

### Ports Not Loading

1. Verify LibreNMS API token is valid
2. Check browser console for errors
3. Verify LibreNMS host is accessible from your network
4. Try increasing `NEXT_PUBLIC_TIMEOUT_MS`

### Performance Issues

1. Reduce `NEXT_PUBLIC_PORT_PAGE_SIZE`
2. Increase `NEXT_PUBLIC_REFRESH_INTERVAL`
3. Use device grouping to reduce visible ports
4. Clear localStorage cache: `localStorage.removeItem('portgrid-cache-v1')`

### CORS Errors

PortGrid uses Next.js API routes as a proxy, so CORS shouldn't be an issue. If you see CORS errors:

1. Verify LibreNMS API is accessible from your server
2. Check LibreNMS API token is correct
3. Ensure LibreNMS server is not blocking requests

## Advanced Configuration

### Custom Port Status Mapping

Edit `lib/portStatus.ts` to customize status colors:

```typescript
export const STATUS_COLORS = {
  'up': 'bg-green-500',
  'down': 'bg-amber-500',
  'disabled': 'bg-red-500',
  'unknown': 'bg-gray-500',
  // Add custom statuses
  'maintenance': 'bg-blue-500',
};
```

### Custom Search Indexing

Extend search functionality in `lib/search.ts` to index additional fields.

### Dark Mode Customization

Edit Tailwind CSS in `tailwind.config.ts` to customize dark mode colors.
