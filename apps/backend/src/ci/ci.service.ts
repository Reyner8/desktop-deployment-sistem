import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as path from 'path';
import {
  UploadSession,
  UploadSessionStatus,
  UploadedPart,
} from './entities/upload-session.entity';
import { CreateUploadDto } from './dto/create-upload.dto';
import { CI_PART_SIZE } from './ci.constants';
import { Release } from '../releases/entities/release.entity';
import { ReleaseService } from '../releases/release.service';
import { ArtifactService } from '../artifacts/artifact.service';
import { ObjectStorage } from '../artifacts/storage/object-storage';
import { ReleaseStatus } from '@rscb/shared';

@Injectable()
export class CiService {
  constructor(
    @InjectRepository(UploadSession)
    private readonly sessionRepository: Repository<UploadSession>,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    private readonly releaseService: ReleaseService,
    private readonly artifactService: ArtifactService,
    private readonly storage: ObjectStorage,
  ) {}

  async start(dto: CreateUploadDto) {
    const existing = await this.releaseRepository.findOne({
      where: { application: dto.application, version: dto.version },
      relations: ['artifact'],
    });
    if (existing) {
      const active = await this.sessionRepository.findOne({
        where: {
          application: dto.application,
          version: dto.version,
          status: UploadSessionStatus.INITIATED,
        },
        relations: ['release'],
      });
      if (active) {
        return this.sessionResponse(active);
      }
      throw new ConflictException(
        `Release ${dto.application} ${dto.version} already exists`,
      );
    }

    const release = this.releaseRepository.create({
      application: dto.application,
      version: dto.version,
      releaseNotes: dto.releaseNotes,
      status: ReleaseStatus.DRAFT,
    });
    const savedRelease = await this.releaseRepository.save(release);

    const ext = dto.fileName ? path.extname(dto.fileName) : '.zip';
    const fileName = dto.fileName || `${dto.application}-${dto.version}${ext}`;
    const objectKey = `${dto.application}/${dto.version}/${dto.version}${ext || '.zip'}`;

    const session = this.sessionRepository.create({
      application: dto.application,
      version: dto.version,
      fileName,
      mimeType: dto.mimeType || 'application/zip',
      totalSize: dto.totalSize,
      sha256: dto.sha256,
      partSize: CI_PART_SIZE,
      objectKey,
      parts: [],
      status: UploadSessionStatus.INITIATED,
      release: savedRelease,
    });
    const saved = await this.sessionRepository.save(session);
    return this.sessionResponse(saved);
  }

  async uploadPart(sessionId: string, partNumber: number, file: Express.Multer.File) {
    const session = await this.getSession(sessionId);
    if (session.status !== UploadSessionStatus.INITIATED) {
      throw new BadRequestException(
        `Cannot upload part in session status ${session.status}`,
      );
    }
    if (!file) {
      throw new BadRequestException('Chunk file is required (field "file")');
    }
    if (partNumber < 1) {
      throw new BadRequestException('Invalid part number');
    }

    const totalParts = this.totalPartsOf(session);
    if (partNumber > totalParts) {
      throw new BadRequestException(
        `partNumber ${partNumber} exceeds expected total parts (${totalParts})`,
      );
    }

    await this.storage.upload(file, this.partKeyFor(session, partNumber));

    const parts = session.parts.filter((p) => p.part !== partNumber);
    parts.push({ part: partNumber, size: file.size });
    parts.sort((a, b) => a.part - b.part);
    session.parts = parts;
    await this.sessionRepository.save(session);

    return { uploadId: session.id, partNumber, accepted: true };
  }

  async getStatus(sessionId: string) {
    const session = await this.getSession(sessionId);
    return this.sessionResponse(session);
  }

  async complete(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (session.status === UploadSessionStatus.COMPLETED) {
      const release = await this.releaseService.findOne(session.release.id);
      return this.releaseWithUrl(release);
    }
    if (session.status !== UploadSessionStatus.INITIATED) {
      throw new BadRequestException(
        `Cannot complete session in status ${session.status}`,
      );
    }

    const missing = this.missingParts(session);
    if (missing.length > 0) {
      throw new ConflictException(
        `Missing parts: ${missing.join(', ')} (${missing.length} of ${this.totalPartsOf(session)})`,
      );
    }

    const expectedSize = Number(session.totalSize);
    const uploadedSize = session.parts.reduce((sum, p) => sum + Number(p.size), 0);
    if (uploadedSize !== expectedSize) {
      throw new ConflictException(
        `Uploaded size ${uploadedSize} does not match total size ${expectedSize}`,
      );
    }

    session.status = UploadSessionStatus.COMPLETING;
    await this.sessionRepository.save(session);

    const partKeys = session.parts.map((p) => this.partKeyFor(session, p.part));

    try {
      await this.storage.composeParts(partKeys, session.objectKey);
      const { sha256, size } = await this.streamSha256(session.objectKey);

      if (size !== expectedSize) {
        await this.storage.delete(session.objectKey);
        await this.failSession(session);
        throw new ConflictException(
          `Composed object size ${size} does not match expected ${expectedSize}`,
        );
      }
      if (session.sha256 && sha256 !== session.sha256) {
        await this.storage.delete(session.objectKey);
        await this.failSession(session);
        throw new ConflictException(
          `SHA-256 mismatch: expected ${session.sha256}, computed ${sha256}`,
        );
      }

      await this.artifactService.registerForRelease(session.release.id, {
        fileName: session.fileName,
        objectKey: session.objectKey,
        size,
        sha256,
        mimeType: session.mimeType,
      });
      await this.releaseService.publish(session.release.id);

      session.status = UploadSessionStatus.COMPLETED;
      await this.sessionRepository.save(session);

      const release = await this.releaseService.findOne(session.release.id);
      return this.releaseWithUrl(release);
    } catch (err) {
      if (err instanceof ConflictException) {
        throw err;
      }
      await this.failSession(session);
      throw err;
    }
  }

  async abort(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (session.status === UploadSessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot abort a completed session');
    }
    await Promise.allSettled(
      session.parts.map((p) => this.storage.delete(this.partKeyFor(session, p.part))),
    );
    await this.releaseRepository.remove(session.release);
    return { uploadId: sessionId, status: UploadSessionStatus.ABORTED };
  }

  async findRelease(application: string, version: string) {
    const release = await this.releaseService.findByApplicationVersion(
      application,
      version,
    );
    if (!release) {
      throw new NotFoundException(
        `Release ${application} ${version} not found`,
      );
    }
    return release;
  }

  private async getSession(sessionId: string): Promise<UploadSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['release'],
    });
    if (!session) {
      throw new NotFoundException('Upload session not found');
    }
    return session;
  }

  private totalPartsOf(session: UploadSession): number {
    return Math.max(1, Math.ceil(Number(session.totalSize) / session.partSize));
  }

  private missingParts(session: UploadSession): number[] {
    const totalParts = this.totalPartsOf(session);
    const uploaded = new Set(session.parts.map((p) => p.part));
    const missing: number[] = [];
    for (let i = 1; i <= totalParts; i++) {
      if (!uploaded.has(i)) {
        missing.push(i);
      }
    }
    return missing;
  }

  private partKeyFor(session: UploadSession, partNumber: number): string {
    return `${session.objectKey}.parts/${partNumber}`;
  }

  private sessionResponse(session: UploadSession) {
    const totalParts = this.totalPartsOf(session);
    const uploaded = session.parts.map((p) => p.part).sort((a, b) => a - b);
    return {
      uploadId: session.id,
      releaseId: session.release?.id,
      application: session.application,
      version: session.version,
      fileName: session.fileName,
      mimeType: session.mimeType,
      totalSize: Number(session.totalSize),
      sha256: session.sha256 || null,
      partSize: session.partSize,
      totalParts,
      uploadedParts: uploaded,
      missingParts: this.missingParts(session),
      status: session.status,
    };
  }

  private async releaseWithUrl(release: Release) {
    if (release.artifact) {
      const downloadUrl = await this.artifactService.getDownloadUrl(
        release.artifact,
      );
      return { ...release, downloadUrl };
    }
    return { ...release, downloadUrl: null };
  }

  private async streamSha256(key: string): Promise<{ sha256: string; size: number }> {
    const stream = await this.storage.getReadStream(key);
    const hash = crypto.createHash('sha256');
    let size = 0;
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        hash.update(chunk);
        size += chunk.length;
      });
      stream.on('end', () => resolve({ sha256: hash.digest('hex'), size }));
      stream.on('error', reject);
    });
  }

  private async failSession(session: UploadSession): Promise<void> {
    session.status = UploadSessionStatus.FAILED;
    await this.sessionRepository.save(session);
  }
}