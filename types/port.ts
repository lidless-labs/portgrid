export interface EnrichedPort {
  port_id: number;
  device_id: number;
  deviceName: string;
  ifName: string;
  ifAlias: string | null;
  ifDescr: string;
  ifAdminStatus: "up" | "down";
  ifOperStatus: "up" | "down";
  ifVlan: number | null;
  ifPhysAddress: string | null;
  neighbor: string | null;
}

export interface DeviceWithPorts {
  device_id: number;
  hostname: string;
  ports: EnrichedPort[];
}

export interface PortsApiResponse {
  devices: DeviceWithPorts[];
}

export interface LibreNMSPort {
  port_id: number;
  device_id: number;
  ifName: string;
  ifAlias: string | null;
  ifDescr: string;
  ifAdminStatus: string;
  ifOperStatus: string;
  ifVlan: number | null;
  ifPhysAddress: string | null;
}

export interface LibreNMSDevice {
  device_id: number;
  hostname: string;
  ip: string | null;
}

export interface LibreNMSLink {
  local_port_id: number;
  remote_hostname: string;
}

// NetDisco types
export interface NetDiscoDevice {
  ip: string;
  dns: string | null;
  name: string | null;
}

export interface NetDiscoPort {
  port: string;
  name: string | null;
  up: string;
  up_admin: string;
  vlan: number | null;
  mac: string | null;
}

export interface NetDiscoNeighbor {
  remote_ip: string;
  remote_port: string;
  remote_device: string | null;
}

// Data source adapter interface
export interface DataSourceAdapter {
  fetchDevicesWithPorts(): Promise<DeviceWithPorts[]>;
}

export type DataSourceType = "librenms" | "netdisco";
