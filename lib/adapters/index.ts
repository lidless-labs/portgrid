import type { DataSourceAdapter, DataSourceType, DeviceWithPorts } from "@/types/port";
import { LibreNMSAdapter } from "./librenms";
import { NetDiscoAdapter } from "./netdisco";

// --- In-memory upstream cache (TTL: 45 seconds) ---
const CACHE_TTL_MS = 45_000;

interface CacheEntry {
  data: DeviceWithPorts[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

class CachedAdapter implements DataSourceAdapter {
  constructor(
    private inner: DataSourceAdapter,
    private cacheKey: string
  ) {}

  async fetchDevicesWithPorts(): Promise<DeviceWithPorts[]> {
    const now = Date.now();
    const cached = cache.get(this.cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[cache] HIT for "${this.cacheKey}" (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
      return cached.data;
    }

    console.log(`[cache] MISS for "${this.cacheKey}" — fetching upstream`);
    const data = await this.inner.fetchDevicesWithPorts();
    cache.set(this.cacheKey, { data, timestamp: now });
    return data;
  }
}

// --- Factory ---

export function createDataSourceAdapter(): DataSourceAdapter {
  const dataSource = (process.env.DATA_SOURCE || "librenms") as DataSourceType;

  let inner: DataSourceAdapter;
  switch (dataSource) {
    case "netdisco":
      inner = new NetDiscoAdapter();
      break;
    case "librenms":
    default:
      inner = new LibreNMSAdapter();
      break;
  }

  return new CachedAdapter(inner, dataSource);
}

export { LibreNMSAdapter, NetDiscoAdapter };
