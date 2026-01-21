import type {
  DataSourceAdapter,
  DeviceWithPorts,
  EnrichedPort,
  LibreNMSDevice,
  LibreNMSLink,
  LibreNMSPort,
} from "@/types/port";
import { matchesAnyPattern, parseFilterPatterns } from "@/lib/utils";

export class LibreNMSAdapter implements DataSourceAdapter {
  private baseUrl: string;
  private apiToken: string;
  private excludePatterns: string[];
  private includePatterns: string[];

  constructor() {
    const baseUrl = process.env.LIBRENMS_URL;
    const apiToken = process.env.LIBRENMS_API_TOKEN;

    if (!baseUrl || !apiToken) {
      throw new Error("LibreNMS configuration missing: LIBRENMS_URL and LIBRENMS_API_TOKEN required");
    }

    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.excludePatterns = parseFilterPatterns(process.env.DEVICE_EXCLUDE);
    this.includePatterns = parseFilterPatterns(process.env.DEVICE_INCLUDE);

    if (this.excludePatterns.length > 0) {
      console.log("Device exclude patterns:", this.excludePatterns);
    }
    if (this.includePatterns.length > 0) {
      console.log("Device include patterns:", this.includePatterns);
    }
  }

  private shouldIncludeDevice(device: LibreNMSDevice): boolean {
    const hostname = device.hostname;
    const ip = device.ip;

    // If include patterns are set, device must match at least one
    if (this.includePatterns.length > 0) {
      const matchesInclude =
        matchesAnyPattern(hostname, this.includePatterns) ||
        matchesAnyPattern(ip, this.includePatterns);
      if (!matchesInclude) return false;
    }

    // If exclude patterns are set, device must NOT match any
    if (this.excludePatterns.length > 0) {
      const matchesExclude =
        matchesAnyPattern(hostname, this.excludePatterns) ||
        matchesAnyPattern(ip, this.excludePatterns);
      if (matchesExclude) return false;
    }

    return true;
  }

  async fetchDevicesWithPorts(): Promise<DeviceWithPorts[]> {
    const headers = {
      "X-Auth-Token": this.apiToken,
      Accept: "application/json",
    };

    console.log("Fetching from LibreNMS:", this.baseUrl);

    // Fetch ports and devices (required)
    // LibreNMS requires explicit columns parameter to include device_id and other fields
    const portColumns = "port_id,device_id,ifName,ifAlias,ifDescr,ifAdminStatus,ifOperStatus,ifVlan,ifPhysAddress";
    const deviceColumns = "device_id,hostname,ip";
    const [portsRes, devicesRes] = await Promise.all([
      fetch(`${this.baseUrl}/api/v0/ports?columns=${portColumns}`, { headers, cache: "no-store" }),
      fetch(`${this.baseUrl}/api/v0/devices?columns=${deviceColumns}`, { headers, cache: "no-store" }),
    ]);

    console.log("Response status - ports:", portsRes.status, "devices:", devicesRes.status);

    if (!portsRes.ok || !devicesRes.ok) {
      const errors = {
        ports: portsRes.ok ? "ok" : await portsRes.text().catch(() => String(portsRes.status)),
        devices: devicesRes.ok ? "ok" : await devicesRes.text().catch(() => String(devicesRes.status)),
      };
      console.error("LibreNMS API errors:", errors);
      throw new Error(`Failed to fetch data from LibreNMS: ${JSON.stringify(errors)}`);
    }

    const [portsData, devicesData] = await Promise.all([
      portsRes.json(),
      devicesRes.json(),
    ]);

    // Fetch links (optional - for LLDP/CDP neighbor info)
    let links: LibreNMSLink[] = [];
    try {
      const linksRes = await fetch(`${this.baseUrl}/api/v0/links`, { headers, cache: "no-store" });
      if (linksRes.ok) {
        const linksData = await linksRes.json();
        links = linksData.links || [];
      }
    } catch {
      console.log("Links endpoint not available, continuing without neighbor data");
    }

    const ports: LibreNMSPort[] = portsData.ports || [];
    const allDevices: LibreNMSDevice[] = devicesData.devices || [];

    // Apply device filtering
    const devices = allDevices.filter((d) => this.shouldIncludeDevice(d));
    console.log(`Devices: ${allDevices.length} total, ${devices.length} after filtering`);

    // Build lookup maps (only for included devices)
    const deviceMap = new Map<number, string>(
      devices.map((d) => [d.device_id, d.hostname])
    );
    const includedDeviceIds = new Set(devices.map((d) => d.device_id));
    const linkMap = new Map<number, string>(
      links.map((l) => [l.local_port_id, l.remote_hostname])
    );

    // Group ports by device (only for included devices)
    const devicePorts = new Map<number, EnrichedPort[]>();

    for (const port of ports) {
      // Skip ports from filtered-out devices
      if (!includedDeviceIds.has(port.device_id)) continue;

      // Defensive null checks - LibreNMS API can return unexpected nulls
      const enriched: EnrichedPort = {
        port_id: port.port_id ?? 0,
        device_id: port.device_id ?? 0,
        deviceName: deviceMap.get(port.device_id) || `Device ${port.device_id}`,
        ifName: port.ifName ?? `port-${port.port_id}`,
        ifAlias: port.ifAlias ?? null,
        ifDescr: port.ifDescr ?? "",
        ifAdminStatus: port.ifAdminStatus === "up" ? "up" : "down",
        ifOperStatus: port.ifOperStatus === "up" ? "up" : "down",
        ifVlan: port.ifVlan ?? null,
        ifPhysAddress: port.ifPhysAddress ?? null,
        neighbor: linkMap.get(port.port_id) || null,
      };

      if (!devicePorts.has(port.device_id)) {
        devicePorts.set(port.device_id, []);
      }
      devicePorts.get(port.device_id)!.push(enriched);
    }

    // Convert to array of DeviceWithPorts, sorted by hostname
    const result: DeviceWithPorts[] = Array.from(devicePorts.entries())
      .map(([device_id, ports]) => ({
        device_id,
        hostname: deviceMap.get(device_id) || `Device ${device_id}`,
        ports: ports.sort((a, b) => a.ifName.localeCompare(b.ifName)),
      }))
      .sort((a, b) => a.hostname.localeCompare(b.hostname));

    return result;
  }
}
