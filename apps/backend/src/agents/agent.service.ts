import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { Device } from '../devices/entities/device.entity';
import { DeviceNetwork } from '../devices/entities/device-network.entity';
import { Release } from '../releases/entities/release.entity';
import { Artifact } from '../artifacts/entities/artifact.entity';
import { Deployment } from '../deployments/entities/deployment.entity';
import { DeploymentEvent } from '../deployments/entities/deployment-event.entity';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { DeploymentStatusDto } from './dto/deployment-status.dto';
import { DeviceStatus, ReleaseStatus, DeploymentStatus, deploymentTransitions } from '@rscb/shared';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(DeviceNetwork)
    private readonly networkRepository: Repository<DeviceNetwork>,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    @InjectRepository(Artifact)
    private readonly artifactRepository: Repository<Artifact>,
    @InjectRepository(Deployment)
    private readonly deploymentRepository: Repository<Deployment>,
    @InjectRepository(DeploymentEvent)
    private readonly eventRepository: Repository<DeploymentEvent>,
  ) {}

  async register(dto: RegisterAgentDto) {
    const existing = await this.deviceRepository.findOne({ where: { deviceId: dto.deviceId } });
    if (existing) {
      throw new ConflictException('Device already registered');
    }
    const token = uuid();
    const device = this.deviceRepository.create({
      deviceId: dto.deviceId,
      hostname: dto.hostname,
      os: dto.os,
      agentVersion: dto.agentVersion,
      applicationVersion: dto.applicationVersion,
      token,
      lastSeen: new Date(),
      status: DeviceStatus.ONLINE,
    });
    const saved = await this.deviceRepository.save(device);
    if (dto.ipAddress && dto.ipAddress.length > 0) {
      const networks = dto.ipAddress.map((ip) =>
        this.networkRepository.create({ device: saved, ipAddress: ip }),
      );
      await this.networkRepository.save(networks);
    }
    return { deviceId: saved.deviceId, token: saved.token };
  }

  async heartbeat(deviceId: string, dto: HeartbeatDto) {
    const device = await this.deviceRepository.findOne({ where: { deviceId }, relations: ['networks'] });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    device.hostname = dto.hostname;
    device.agentVersion = dto.agentVersion;
    if (dto.applicationVersion) {
      device.applicationVersion = dto.applicationVersion;
    }
    device.lastSeen = new Date();
    device.status = DeviceStatus.ONLINE;
    await this.deviceRepository.save(device);

    if (dto.ipAddress && dto.ipAddress.length > 0) {
      await this.networkRepository.delete({ device: { id: device.id } });
      const networks = dto.ipAddress.map((ip) =>
        this.networkRepository.create({ device, ipAddress: ip }),
      );
      await this.networkRepository.save(networks);
    }
    return { status: 'ok' };
  }

  async getUpdates(deviceId: string) {
    const device = await this.deviceRepository.findOne({ where: { deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    const releases = await this.releaseRepository.find({
      where: { status: ReleaseStatus.PUBLISHED },
      relations: ['artifact'],
      order: { publishedAt: 'DESC' },
    });
    if (releases.length === 0) {
      return { hasUpdate: false };
    }
    const latest = releases[0];
    if (!device.applicationVersion) {
      return { hasUpdate: true, latestVersion: latest.version, downloadUrl: `/api/v1/agents/artifacts/${latest.id}/download-url` };
    }
    try {
      const cmp = this.compareVersions(latest.version, device.applicationVersion);
      if (cmp > 0) {
        return { hasUpdate: true, latestVersion: latest.version, downloadUrl: `/api/v1/agents/artifacts/${latest.id}/download-url` };
      }
    } catch {
      if (latest.version !== device.applicationVersion) {
        return { hasUpdate: true, latestVersion: latest.version, downloadUrl: `/api/v1/agents/artifacts/${latest.id}/download-url` };
      }
    }
    return { hasUpdate: false };
  }

  async reportDeploymentStatus(deploymentId: string, dto: DeploymentStatusDto) {
    const deployment = await this.deploymentRepository.findOne({
      where: { id: deploymentId },
      relations: ['events'],
    });
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }
    const newStatus = dto.status as DeploymentStatus;
    const validNext = deploymentTransitions.get(deployment.status) || [];
    if (validNext.length > 0 && !validNext.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${deployment.status} to ${newStatus}`,
      );
    }
    deployment.status = newStatus;
    if (dto.errorMessage) {
      deployment.errorMessage = dto.errorMessage;
    }
    await this.deploymentRepository.save(deployment);

    const event = this.eventRepository.create({
      deployment,
      status: newStatus,
      message: dto.message || `Status updated to ${newStatus}`,
    });
    await this.eventRepository.save(event);

    if (newStatus === DeploymentStatus.SUCCESS || newStatus === DeploymentStatus.FAILED) {
      await this.deviceRepository.update(
        { id: deployment.device.id },
        { status: newStatus === DeploymentStatus.SUCCESS ? DeviceStatus.ONLINE : DeviceStatus.ERROR },
      );
    }
    return { status: 'ok' };
  }

  async getDownloadUrl(releaseId: string) {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
      relations: ['artifact'],
    });
    if (!release || !release.artifact) {
      throw new NotFoundException('Release or artifact not found');
    }
    return { downloadUrl: `/api/v1/artifacts/file/${release.artifact.objectKey}` };
  }

  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }
}