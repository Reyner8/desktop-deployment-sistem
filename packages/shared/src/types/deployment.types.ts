import { DeploymentStatus } from '../enums/deployment-status.enum';

export interface DeploymentInfo {
  id: string;
  releaseId: string;
  releaseVersion: string;
  deviceId: string;
  deviceHostname: string;
  status: DeploymentStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  events: DeploymentEvent[];
}

export interface DeploymentEvent {
  id: string;
  status: DeploymentStatus;
  message: string;
  timestamp: string;
}

export interface CreateDeploymentRequest {
  releaseId: string;
  deviceIds: string[];
}

export interface DeployTargetInfo {
  deviceId: string;
  hostname: string;
  currentVersion: string | null;
  status: string;
}