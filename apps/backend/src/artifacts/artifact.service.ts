import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';
import { Artifact } from './entities/artifact.entity';
import { Release } from '../releases/entities/release.entity';
import { ObjectStorage } from './storage/object-storage';
import { ReleaseStatus } from '@rscb/shared';

@Injectable()
export class ArtifactService {
  constructor(
    @InjectRepository(Artifact)
    private readonly artifactRepository: Repository<Artifact>,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    private readonly storage: ObjectStorage,
    private readonly configService: ConfigService,
  ) {}

  async uploadFile(releaseId: string, file: Express.Multer.File) {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
      relations: ['artifact'],
    });
    if (!release) {
      throw new NotFoundException('Release not found');
    }
    if (release.status !== ReleaseStatus.DRAFT) {
      throw new BadRequestException('Can only upload artifact to DRAFT release');
    }

    const sha256 = this.calculateSha256(file.buffer);
    const ext = path.extname(file.originalname);
    const objectKey = `${release.application}/${release.version}/${release.version}${ext}`;

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
    return saved;
  }

  async getDownloadUrl(artifact: Artifact) {
    return this.storage.getSignedUrl(artifact.objectKey);
  }

  calculateSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async findArtifactByKey(key: string): Promise<Artifact | null> {
    return this.artifactRepository.findOne({ where: { objectKey: key } });
  }
}
