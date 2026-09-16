import { DeploymentStatus } from '../enums/deployment-status.enum';

export interface DeploymentEvent {
  id: string;
  status: DeploymentStatus;
  message: string;
  timestamp: string;
}

export interface DeploymentInfo {
  id: string;
  status: DeploymentStatus;
  errorMessage?: string | null;
  device?: { id: string; deviceId: string; hostname: string } | null;
  release?: { id: string; application: string; version: string } | null;
  events?: DeploymentEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeploymentRequest {
  releaseId: string;
  deviceIds: string[];
}

export interface DeployTargetInfo {
  deviceId: string;
  hostname: string;
  ipAddress: string;
  currentVersion: string | null;
  status: string;
}
