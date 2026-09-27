import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Release } from './entities/release.entity';
import { ArtifactService } from '../artifacts/artifact.service';
import { AuditService } from '../audit/audit.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { QueryReleaseDto } from './dto/query-release.dto';
import { AuditAction, ReleaseStatus, releaseTransitions } from '@rscb/shared';
import { resolveOrder } from '../common/sort.util';

const SORTABLE_FIELDS = [
  'application',
  'version',
  'status',
  'createdAt',
  'publishedAt',
] as const;

@Injectable()
export class ReleaseService {
  constructor(
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    private readonly artifactService: ArtifactService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateReleaseDto, actor = 'system') {
    const existing = await this.releaseRepository.findOne({
      where: { application: dto.application, version: dto.version },
    });
    if (existing) {
      throw new BadRequestException('Release version already exists for this application');
    }
    const release = this.releaseRepository.create({
      application: dto.application,
      version: dto.version,
      releaseNotes: dto.releaseNotes,
      status: ReleaseStatus.DRAFT,
    });
    const saved = await this.releaseRepository.save(release);
    await this.auditService.log({
      actor,
      action: AuditAction.RELEASE_CREATED,
      target: 'RELEASE',
      targetId: saved.id,
      details: { application: saved.application, version: saved.version },
      result: 'SUCCESS',
    });
    return saved;
  }

  async findAll(query: QueryReleaseDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.version = Like(`%${query.search}%`);
    }
    if (query.application) {
      where.application = query.application;
    }

    const [data, total] = await this.releaseRepository.findAndCount({
      where,
      relations: ['artifact'],
      skip,
      take: limit,
      order: resolveOrder(query.sortBy, SORTABLE_FIELDS, 'createdAt', query.sortOrder),
    });

    const items = await Promise.all(data.map((release) => this.withDownloadUrl(release)));

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const release = await this.releaseRepository.findOne({
      where: { id },
      relations: ['artifact'],
    });
    if (!release) {
      throw new NotFoundException('Release not found');
    }
    return this.withDownloadUrl(release);
  }

  async findByApplicationVersion(application: string, version: string, status?: string) {
    const where: any = { application, version };
    if (status) {
      where.status = status;
    }
    const release = await this.releaseRepository.findOne({
      where,
      relations: ['artifact'],
    });
    if (!release) {
      return null;
    }
    return this.withDownloadUrl(release);
  }

  async publish(id: string, actor = 'system') {
    const release = await this.findOne(id);
    const validNext = releaseTransitions.get(release.status) || [];
    if (!validNext.includes(ReleaseStatus.PUBLISHED)) {
      throw new BadRequestException(`Cannot publish release in status ${release.status}`);
    }
    if (!release.artifact) {
      throw new BadRequestException('Cannot publish release without artifact');
    }
    release.status = ReleaseStatus.PUBLISHED;
    release.publishedAt = new Date();
    const saved = await this.releaseRepository.save(release);
    await this.auditService.log({
      actor,
      action: AuditAction.RELEASE_PUBLISHED,
      target: 'RELEASE',
      targetId: saved.id,
      details: { application: saved.application, version: saved.version },
      result: 'SUCCESS',
    });
    return saved;
  }

  async archive(id: string, actor = 'system') {
    const release = await this.findOne(id);
    const validNext = releaseTransitions.get(release.status) || [];
    if (!validNext.includes(ReleaseStatus.ARCHIVED)) {
      throw new BadRequestException(`Cannot archive release in status ${release.status}`);
    }
    release.status = ReleaseStatus.ARCHIVED;
    const saved = await this.releaseRepository.save(release);
    await this.auditService.log({
      actor,
      action: AuditAction.RELEASE_ARCHIVED,
      target: 'RELEASE',
      targetId: saved.id,
      details: { application: saved.application, version: saved.version },
      result: 'SUCCESS',
    });
    return saved;
  }

  private async withDownloadUrl(release: Release) {
    if (release.artifact) {
      const downloadUrl = await this.artifactService.getDownloadUrl(release.artifact);
      return { ...release, downloadUrl };
    }
    return { ...release, downloadUrl: null };
  }
}
