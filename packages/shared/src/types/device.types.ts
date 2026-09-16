import { DeviceStatus } from '../enums/device-status.enum';

export interface DeviceNetworkInfo {
  id: string;
  ipAddress: string;
}

export interface DeviceInfo {
  id: string;
  deviceId: string;
  hostname: string;
  os: string | null;
  agentVersion: string;
  applicationVersion: string | null;
  status: DeviceStatus;
  lastSeen: string;
  networks?: DeviceNetworkInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface DeviceHeartbeat {
  hostname: string;
  ipAddress?: string[];
  applicationVersion?: string | null;
  agentVersion: string;
}
