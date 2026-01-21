import type {
  DataSourceAdapter,
  DeviceWithPorts,
  EnrichedPort,
  NetDiscoDevice,
  NetDiscoNeighbor,
  NetDiscoPort,
} from "@/types/port";

// Convert IP address to a numeric hash for device_id
function ipToDeviceId(ip: string): number {
  const parts = ip.split(".");
  if (parts.length === 4) {
    // IPv4: convert to 32-bit integer
    return parts.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }
  // Fallback: simple hash for non-IPv4 addresses
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Batch array into chunks for parallel processing
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export class NetDiscoAdapter implements DataSourceAdapter {
  private baseUrl: string;
  private apiKey: string;
  private batchSize = 5;

  constructor() {
    const baseUrl = process.env.NETDISCO_URL;
    const apiKey = process.env.NETDISCO_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new Error("NetDisco configuration missing: NETDISCO_URL and NETDISCO_API_KEY required");
    }

    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
  }

  async fetchDevicesWithPorts(): Promise<DeviceWithPorts[]> {
    console.log("Fetching from NetDisco:", this.baseUrl);

    // Fetch all devices
    const devicesRes = await fetch(`${this.baseUrl}/api/v1/search/device`, {
      headers: this.headers,
      cache: "no-store",
    });

    if (!devicesRes.ok) {
      const errorText = await devicesRes.text().catch(() => String(devicesRes.status));
      console.error("NetDisco API error:", errorText);
      throw new Error(`Failed to fetch devices from NetDisco: ${errorText}`);
    }

    const devices: NetDiscoDevice[] = await devicesRes.json();
    console.log(`Found ${devices.length} devices in NetDisco`);

    // Fetch ports and neighbors for each device in batches
    const deviceChunks = chunk(devices, this.batchSize);
    const results: DeviceWithPorts[] = [];

    for (const deviceBatch of deviceChunks) {
      const batchResults = await Promise.allSettled(
        deviceBatch.map((device) => this.fetchDeviceData(device))
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled" && result.value) {
          results.push(result.value);
        } else if (result.status === "rejected") {
          console.error("Failed to fetch device data:", result.reason);
        }
      }
    }

    // Sort by hostname
    return results.sort((a, b) => a.hostname.localeCompare(b.hostname));
  }

  private async fetchDeviceData(device: NetDiscoDevice): Promise<DeviceWithPorts | null> {
    const deviceId = ipToDeviceId(device.ip);
    const hostname = device.dns || device.name || device.ip;

    // Fetch ports and neighbors in parallel
    const [portsRes, neighborsRes] = await Promise.allSettled([
      fetch(`${this.baseUrl}/api/v1/object/device/${encodeURIComponent(device.ip)}/ports`, {
        headers: this.headers,
        cache: "no-store",
      }),
      fetch(`${this.baseUrl}/api/v1/object/device/${encodeURIComponent(device.ip)}/neighbors`, {
        headers: this.headers,
        cache: "no-store",
      }),
    ]);

    // Parse ports
    let ports: NetDiscoPort[] = [];
    if (portsRes.status === "fulfilled" && portsRes.value.ok) {
      ports = await portsRes.value.json();
    } else {
      console.log(`No ports available for device ${device.ip}`);
    }

    // Parse neighbors
    let neighbors: NetDiscoNeighbor[] = [];
    if (neighborsRes.status === "fulfilled" && neighborsRes.value.ok) {
      neighbors = await neighborsRes.value.json();
    }

    // Build neighbor lookup by port name
    const neighborMap = new Map<string, string>();
    for (const neighbor of neighbors) {
      if (neighbor.remote_device) {
        neighborMap.set(neighbor.remote_port, neighbor.remote_device);
      }
    }

    // Convert ports to EnrichedPort format
    const enrichedPorts: EnrichedPort[] = ports.map((port, index) => ({
      port_id: deviceId * 10000 + index, // Generate unique port_id
      device_id: deviceId,
      deviceName: hostname,
      ifName: port.port,
      ifAlias: port.name,
      ifDescr: port.port,
      ifAdminStatus: port.up_admin === "up" ? "up" : "down",
      ifOperStatus: port.up === "up" ? "up" : "down",
      ifVlan: port.vlan,
      ifPhysAddress: port.mac,
      neighbor: neighborMap.get(port.port) || null,
    }));

    return {
      device_id: deviceId,
      hostname,
      ports: enrichedPorts.sort((a, b) => a.ifName.localeCompare(b.ifName)),
    };
  }
}
