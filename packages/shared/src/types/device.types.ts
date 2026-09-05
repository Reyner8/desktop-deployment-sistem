import { DeviceStatus } from '../enums/device-status.enum';

export interface DeviceInfo {
  deviceId: string;
  hostname: string;
  ipAddress: string[];
  os: string;
  agentVersion: string;
  applicationVersion: string | null;
  lastSeen: string;
  status: DeviceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceHeartbeat {
  deviceId: string;
  hostname: string;
  ipAddress: string[];
  applicationVersion: string | null;
  agentVersion: string;
  timestamp: string;
}