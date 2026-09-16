import { ReleaseStatus } from '../enums/release-status.enum';
import { DeploymentStatus } from '../enums/deployment-status.enum';

export const releaseTransitions: Map<ReleaseStatus, ReleaseStatus[]> = new Map([
  [ReleaseStatus.DRAFT, [ReleaseStatus.UPLOADING, ReleaseStatus.ARCHIVED]],
  [ReleaseStatus.UPLOADING, [ReleaseStatus.VERIFYING, ReleaseStatus.FAILED]],
  [ReleaseStatus.VERIFYING, [ReleaseStatus.PUBLISHED, ReleaseStatus.FAILED]],
  [ReleaseStatus.PUBLISHED, [ReleaseStatus.ARCHIVED]],
  [ReleaseStatus.FAILED, [ReleaseStatus.UPLOADING]],
  [ReleaseStatus.ARCHIVED, []],
]);

export const deploymentTransitions: Map<DeploymentStatus, DeploymentStatus[]> = new Map([
  [DeploymentStatus.PENDING, [DeploymentStatus.ASSIGNED, DeploymentStatus.CANCELLED]],
  [DeploymentStatus.ASSIGNED, [DeploymentStatus.DOWNLOADING, DeploymentStatus.CANCELLED]],
  [DeploymentStatus.DOWNLOADING, [DeploymentStatus.VERIFYING, DeploymentStatus.FAILED]],
  [DeploymentStatus.VERIFYING, [DeploymentStatus.INSTALLING, DeploymentStatus.FAILED]],
  [DeploymentStatus.INSTALLING, [DeploymentStatus.STARTING, DeploymentStatus.FAILED]],
  [DeploymentStatus.STARTING, [DeploymentStatus.SUCCESS, DeploymentStatus.FAILED]],
  [DeploymentStatus.SUCCESS, []],
  [DeploymentStatus.FAILED, [DeploymentStatus.CANCELLED]],
  [DeploymentStatus.CANCELLED, []],
]);
