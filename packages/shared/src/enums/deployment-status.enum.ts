export enum DeploymentStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  DOWNLOADING = 'DOWNLOADING',
  VERIFYING = 'VERIFYING',
  // Agent sudah siap memasang tetapi SIMRS masih berjalan sehingga
  // installation ditunda sampai user menutup aplikasi.
  WAITING = 'WAITING',
  INSTALLING = 'INSTALLING',
  STARTING = 'STARTING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}