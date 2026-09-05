import { ReleaseStatus } from '../enums/release-status.enum';

export interface ReleaseInfo {
  id: string;
  version: string;
  application: string;
  releaseNotes?: string;
  status: ReleaseStatus;
  createdAt: string;
  publishedAt?: string;
  artifact?: ArtifactInfo;
}

export interface ArtifactInfo {
  id: string;
  fileName: string;
  objectKey: string;
  size: number;
  sha256: string;
  mimeType: string;
  createdAt: string;
}