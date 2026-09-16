import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';
import { Artifact } from './entities/artifact.entity';
import { Release } from '../releases/entities/release.entity';
import { ObjectStorage } from './storage/object-storage';
import { AuditService } from '../audit/audit.service';
import { AuditAction, ReleaseStatus } from '@rscb/shared';

@Injectable()
export class ArtifactService {
  constructor(
    @InjectRepository(Artifact)
    private readonly artifactRepository: Repository<Artifact>,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    private readonly storage: ObjectStorage,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async uploadFile(releaseId: string, file: Express.Multer.File, actor = 'system') {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
      relations: ['artifact'],
    });
    if (!release) {
      throw new NotFoundException('Release not found');
    }
    if (release.status !== ReleaseStatus.DRAFT && release.status !== ReleaseStatus.FAILED) {
      throw new BadRequestException('Can only upload artifact to DRAFT or FAILED release');
    }

    const sha256 = this.calculateSha256(file.buffer);
    const ext = path.extname(file.originalname);
    const objectKey = `${release.application}/${release.version}/${release.version}${ext}`;

    release.status = ReleaseStatus.UPLOADING;
    await this.releaseRepository.save(release);

    try {
      await this.storage.upload(file, objectKey);

      if (release.artifact) {
        await this.storage.delete(release.artifact.objectKey);
        await this.artifactRepository.remove(release.artifact);
      }

      const storageDriver = this.configService.get('STORAGE_DRIVER') || 'local';

      const artifact = this.artifactRepository.create({
        fileName: file.originalname,
        objectKey,
        size: file.size,
        sha256,
        mimeType: file.mimetype,
        storageDriver,
        release,
      });

      release.status = ReleaseStatus.VERIFYING;
      await this.releaseRepository.save(release);

      const saved = await this.artifactRepository.save(artifact);

      await this.auditService.log({
        actor,
        action: AuditAction.ARTIFACT_UPLOADED,
        target: 'ARTIFACT',
        targetId: saved.id,
        details: {
          releaseId: release.id,
          fileName: saved.fileName,
          size: saved.size,
          sha256: saved.sha256,
        },
        result: 'SUCCESS',
      });
      return saved;
    } catch (err) {
      release.status = ReleaseStatus.FAILED;
      await this.releaseRepository.save(release);
      throw err;
    }
  }

  async registerForRelease(
    releaseId: string,
    meta: {
      fileName: string;
      objectKey: string;
      size: number;
      sha256: string;
      mimeType: string;
    },
    actor = 'system',
  ) {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
      relations: ['artifact'],
    });
    if (!release) {
      throw new NotFoundException('Release not found');
    }
    const storageDriver = this.configService.get('STORAGE_DRIVER') || 'local';

    if (release.artifact) {
      await this.storage.delete(release.artifact.objectKey);
      await this.artifactRepository.remove(release.artifact);
    }

    const artifact = this.artifactRepository.create({
      fileName: meta.fileName,
      objectKey: meta.objectKey,
      size: meta.size,
      sha256: meta.sha256,
      mimeType: meta.mimeType,
      storageDriver,
      release,
    });

    release.status = ReleaseStatus.VERIFYING;
    await this.releaseRepository.save(release);
    const saved = await this.artifactRepository.save(artifact);

    await this.auditService.log({
      actor,
      action: AuditAction.ARTIFACT_UPLOADED,
      target: 'ARTIFACT',
      targetId: saved.id,
      details: {
        releaseId: release.id,
        fileName: saved.fileName,
        size: saved.size,
        sha256: saved.sha256,
      },
      result: 'SUCCESS',
    });
    return saved;
  }

  async getDownloadUrl(artifact: Artifact) {
    return this.storage.getSignedUrl(artifact.objectKey);
  }

  async getReadStream(artifact: Artifact) {
    return this.storage.getReadStream(artifact.objectKey);
  }

  isLocalStorage(): boolean {
    return (this.configService.get('STORAGE_DRIVER') || 'local') === 'local';
  }

  calculateSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
