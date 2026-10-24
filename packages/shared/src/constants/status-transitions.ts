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
  // VERIFYING masih boleh langsung ke INSTALLING supaya agent lama yang tidak
  // mengirim WAITING tetap kompatibel. Agent baru mengirim WAITING lebih dulu
  // ketika SIMRS masih berjalan.
  [
    DeploymentStatus.VERIFYING,
    [DeploymentStatus.WAITING, DeploymentStatus.INSTALLING, DeploymentStatus.FAILED],
  ],
  [
    DeploymentStatus.WAITING,
    [DeploymentStatus.INSTALLING, DeploymentStatus.FAILED, DeploymentStatus.CANCELLED],
  ],
  [DeploymentStatus.INSTALLING, [DeploymentStatus.STARTING, DeploymentStatus.FAILED]],
  [DeploymentStatus.STARTING, [DeploymentStatus.SUCCESS, DeploymentStatus.FAILED]],
  [DeploymentStatus.SUCCESS, []],
  [DeploymentStatus.FAILED, [DeploymentStatus.CANCELLED]],
  [DeploymentStatus.CANCELLED, []],
]);

/**
 * Urutan lifecycle deployment untuk perbandingan posisi status (laporan
 * agent "di depan" atau "di belakang" status server — dipakai idempotensi
 * laporan di AgentService.reportDeploymentStatus). FAILED dan CANCELLED
 * terminal; posisinya di akhir hanya agar indexOf selalu menemukan nilai.
 */
export const deploymentStatusOrder: DeploymentStatus[] = [
  DeploymentStatus.PENDING,
  DeploymentStatus.ASSIGNED,
  DeploymentStatus.DOWNLOADING,
  DeploymentStatus.VERIFYING,
  DeploymentStatus.WAITING,
  DeploymentStatus.INSTALLING,
  DeploymentStatus.STARTING,
  DeploymentStatus.SUCCESS,
  DeploymentStatus.FAILED,
  DeploymentStatus.CANCELLED,
];

/** Status deployment yang tidak bisa berubah lagi. */
export const terminalDeploymentStatuses: DeploymentStatus[] = [
  DeploymentStatus.SUCCESS,
  DeploymentStatus.FAILED,
  DeploymentStatus.CANCELLED,
];

/** Status deployment yang masih bisa dilanjutkan oleh agent. */
export const activeDeploymentStatuses: DeploymentStatus[] = deploymentStatusOrder.filter(
  (status) => !terminalDeploymentStatuses.includes(status),
);
