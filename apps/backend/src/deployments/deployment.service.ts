import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Deployment } from './entities/deployment.entity';
import { DeploymentEvent } from './entities/deployment-event.entity';
import { Release } from '../releases/entities/release.entity';
import { Device } from '../devices/entities/device.entity';
import { AuditService } from '../audit/audit.service';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { QueryDeploymentDto } from './dto/query-deployment.dto';
import { AuditAction, DeploymentStatus, ReleaseStatus, deploymentTransitions } from '@rscb/shared';

@Injectable()
export class DeploymentService {
  constructor(
    @InjectRepository(Deployment)
    private readonly deploymentRepository: Repository<Deployment>,
    @InjectRepository(DeploymentEvent)
    private readonly eventRepository: Repository<DeploymentEvent>,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateDeploymentDto, actor = 'system') {
    const release = await this.releaseRepository.findOne({ where: { id: dto.releaseId } });
    if (!release) {
      throw new NotFoundException('Release not found');
    }
    if (release.status !== ReleaseStatus.PUBLISHED) {
      throw new BadRequestException('Can only deploy a PUBLISHED release');
    }
    const devices = await this.deviceRepository.find({
      where: { id: In(dto.deviceIds), isActive: true },
    });
    if (devices.length === 0) {
      throw new NotFoundException('No active devices found');
    }

    const deployments: Deployment[] = [];
    for (const device of devices) {
      const deployment = this.deploymentRepository.create({
        release,
        device,
        status: DeploymentStatus.PENDING,
      });
      const saved = await this.deploymentRepository.save(deployment);
      const event = this.eventRepository.create({
        deployment: saved,
        status: DeploymentStatus.PENDING,
        message: 'Deployment created',
      });
      await this.eventRepository.save(event);
      await this.auditService.log({
        actor,
        action: AuditAction.DEPLOYMENT_CREATED,
        target: 'DEPLOYMENT',
        targetId: saved.id,
        details: {
          releaseId: release.id,
          releaseVersion: release.version,
          deviceId: device.id,
          hostname: device.hostname,
        },
        result: 'SUCCESS',
      });
      deployments.push(saved);
    }
    return deployments;
  }

  async findAll(query: QueryDeploymentDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.releaseId) {
      where.release = { id: query.releaseId };
    }
    if (query.deviceId) {
      where.device = { id: query.deviceId };
    }

    const [data, total] = await this.deploymentRepository.findAndCount({
      where,
      relations: ['release', 'device', 'events'],
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
    const deployment = await this.deploymentRepository.findOne({
      where: { id },
      relations: ['release', 'device', 'events'],
    });
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }
    return deployment;
  }

  async cancel(id: string, actor = 'system') {
    const deployment = await this.findOne(id);
    const previousStatus = deployment.status;
    const validNext = deploymentTransitions.get(deployment.status) || [];
    if (!validNext.includes(DeploymentStatus.CANCELLED)) {
      throw new BadRequestException(`Cannot cancel deployment in status ${deployment.status}`);
    }
    deployment.status = DeploymentStatus.CANCELLED;
    await this.deploymentRepository.save(deployment);
    const event = this.eventRepository.create({
      deployment,
      status: DeploymentStatus.CANCELLED,
      message: 'Deployment cancelled by user',
    });
    await this.eventRepository.save(event);
    await this.auditService.log({
      actor,
      action: AuditAction.DEPLOYMENT_CANCELLED,
      target: 'DEPLOYMENT',
      targetId: deployment.id,
      details: { previousStatus },
      result: 'SUCCESS',
    });
    return deployment;
  }
}
