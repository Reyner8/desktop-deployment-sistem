import { ReleaseStatus } from '../enums/release-status.enum';

export interface ArtifactInfo {
  id: string;
  fileName: string;
  objectKey: string;
  size: number;
  sha256: string;
  mimeType: string;
  storageDriver: string;
  createdAt: string;
}

export interface ReleaseInfo {
  id: string;
  application: string;
  version: string;
  releaseNotes?: string | null;
  status: ReleaseStatus;
  createdAt: string;
  publishedAt?: string | null;
  updatedAt: string;
  artifact?: ArtifactInfo | null;
}
