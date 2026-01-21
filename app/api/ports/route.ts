import { NextResponse } from "next/server";
import type {
  DeviceWithPorts,
  EnrichedPort,
  LibreNMSDevice,
  LibreNMSLink,
  LibreNMSPort,
} from "@/types/port";

export async function GET() {
  const baseUrl = process.env.LIBRENMS_URL;
  const apiToken = process.env.LIBRENMS_API_TOKEN;

  if (!baseUrl || !apiToken) {
    return NextResponse.json(
      { error: "LibreNMS configuration missing" },
      { status: 500 }
    );
  }

  const headers = {
    "X-Auth-Token": apiToken,
    Accept: "application/json",
  };

  try {
    console.log("Fetching from LibreNMS:", baseUrl);

    // Fetch ports and devices (required)
    const [portsRes, devicesRes] = await Promise.all([
      fetch(`${baseUrl}/api/v0/ports`, { headers, cache: "no-store" }),
      fetch(`${baseUrl}/api/v0/devices`, { headers, cache: "no-store" }),
    ]);

    console.log("Response status - ports:", portsRes.status, "devices:", devicesRes.status);

    if (!portsRes.ok || !devicesRes.ok) {
      const errors = {
        ports: portsRes.ok ? "ok" : await portsRes.text().catch(() => portsRes.status),
        devices: devicesRes.ok ? "ok" : await devicesRes.text().catch(() => devicesRes.status),
      };
      console.error("LibreNMS API errors:", errors);
      return NextResponse.json(
        { error: "Failed to fetch data from LibreNMS", details: errors },
        { status: 502 }
      );
    }

    const [portsData, devicesData] = await Promise.all([
      portsRes.json(),
      devicesRes.json(),
    ]);

    // Fetch links (optional - for LLDP/CDP neighbor info)
    let links: LibreNMSLink[] = [];
    try {
      const linksRes = await fetch(`${baseUrl}/api/v0/links`, { headers, cache: "no-store" });
      if (linksRes.ok) {
        const linksData = await linksRes.json();
        links = linksData.links || [];
      }
    } catch {
      console.log("Links endpoint not available, continuing without neighbor data");
    }

    const ports: LibreNMSPort[] = portsData.ports || [];
    const devices: LibreNMSDevice[] = devicesData.devices || [];

    // Build lookup maps
    const deviceMap = new Map<number, string>(
      devices.map((d) => [d.device_id, d.hostname])
    );
    const linkMap = new Map<number, string>(
      links.map((l) => [l.local_port_id, l.remote_hostname])
    );

    // Group ports by device
    const devicePorts = new Map<number, EnrichedPort[]>();

    for (const port of ports) {
      const enriched: EnrichedPort = {
        port_id: port.port_id,
        device_id: port.device_id,
        deviceName: deviceMap.get(port.device_id) || `Device ${port.device_id}`,
        ifName: port.ifName,
        ifAlias: port.ifAlias,
        ifDescr: port.ifDescr,
        ifAdminStatus: port.ifAdminStatus === "up" ? "up" : "down",
        ifOperStatus: port.ifOperStatus === "up" ? "up" : "down",
        ifVlan: port.ifVlan,
        ifPhysAddress: port.ifPhysAddress,
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

    return NextResponse.json({ devices: result });
  } catch (error) {
    console.error("Error fetching LibreNMS data:", error);
    return NextResponse.json(
      { error: "Failed to connect to LibreNMS" },
      { status: 502 }
    );
  }
}
