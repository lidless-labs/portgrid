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
}

export interface LibreNMSLink {
  local_port_id: number;
  remote_hostname: string;
}
