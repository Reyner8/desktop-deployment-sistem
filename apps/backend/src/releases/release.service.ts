import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Release } from './entities/release.entity';
import { CreateReleaseDto } from './dto/create-release.dto';
import { QueryReleaseDto } from './dto/query-release.dto';
import { ReleaseStatus, releaseTransitions } from '@rscb/shared';

@Injectable()
export class ReleaseService {
  constructor(
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
  ) {}

  async create(dto: CreateReleaseDto) {
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
    return this.releaseRepository.save(release);
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
      order: { createdAt: 'DESC' },
    });

    return {
      data,
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
    return release;
  }

  async publish(id: string) {
    const release = await this.findOne(id);
    const validNext = releaseTransitions.get(release.status) || [];
    if (!validNext.includes(ReleaseStatus.PUBLISHED)) {
      throw new BadRequestException(
        `Cannot publish release in status ${release.status}`,
      );
    }
    if (!release.artifact) {
      throw new BadRequestException('Cannot publish release without artifact');
    }
    release.status = ReleaseStatus.PUBLISHED;
    release.publishedAt = new Date();
    return this.releaseRepository.save(release);
  }

  async archive(id: string) {
    const release = await this.findOne(id);
    release.status = ReleaseStatus.PUBLISHED;
    return this.releaseRepository.save(release);
  }
}