import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Device } from '../devices/entities/device.entity';
import { Release } from '../releases/entities/release.entity';
import { Deployment } from '../deployments/entities/deployment.entity';
import {
  DeploymentStatus,
  DeviceStatus,
  DEVICE_OFFLINE_AFTER_MS,
  ReleaseStatus,
} from '@rscb/shared';

const ACTIVITY_DAYS = 7;
const RECENT_LIMIT = 5;
const VERSION_TOP = 6;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    @InjectRepository(Deployment)
    private readonly deploymentRepository: Repository<Deployment>,
  ) {}

  async getStats() {
    const now = Date.now();
    const devices = await this.deviceRepository.find({
      select: ['id', 'applicationVersion', 'status', 'lastSeen'],
    });

    let onlineDevices = 0;
    let offlineDevices = 0;
    let pendingUpdates = 0;
    const versionCounts = new Map<string, number>();

    for (const device of devices) {
      const isOffline = device.lastSeen.getTime() < now - DEVICE_OFFLINE_AFTER_MS;
      if (isOffline) {
        offlineDevices += 1;
      } else {
        onlineDevices += 1;
        if (device.status === DeviceStatus.UPDATE_AVAILABLE) {
          pendingUpdates += 1;
        }
      }
      const version = device.applicationVersion || 'Unknown';
      versionCounts.set(version, (versionCounts.get(version) || 0) + 1);
    }

    const activityStart = new Date(now);
    activityStart.setUTCDate(activityStart.getUTCDate() - (ACTIVITY_DAYS - 1));
    activityStart.setUTCHours(0, 0, 0, 0);

    const [currentRelease, failedDeployments, recentDeployments, activityRows] =
      await Promise.all([
        this.releaseRepository.findOne({
          where: { status: ReleaseStatus.PUBLISHED },
          order: { publishedAt: 'DESC' },
        }),
        this.deploymentRepository.count({ where: { status: DeploymentStatus.FAILED } }),
        this.deploymentRepository.find({
          relations: ['device', 'release'],
          order: { createdAt: 'DESC' },
          take: RECENT_LIMIT,
        }),
        this.deploymentRepository.find({
          select: ['id', 'status', 'createdAt'],
          where: { createdAt: MoreThanOrEqual(activityStart) },
        }),
      ]);

    const buckets = new Map<string, { date: string; total: number; success: number; failed: number }>();
    for (let i = 0; i < ACTIVITY_DAYS; i++) {
      const date = new Date(activityStart);
      date.setUTCDate(date.getUTCDate() + i);
      const key = dayKey(date);
      buckets.set(key, { date: key, total: 0, success: 0, failed: 0 });
    }
    for (const row of activityRows) {
      const bucket = buckets.get(dayKey(new Date(row.createdAt)));
      if (!bucket) continue;
      bucket.total += 1;
      if (row.status === DeploymentStatus.SUCCESS) bucket.success += 1;
      if (row.status === DeploymentStatus.FAILED) bucket.failed += 1;
    }

    const deviceVersionDistribution = [...versionCounts.entries()]
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, VERSION_TOP);

    return {
      totalDevices: devices.length,
      onlineDevices,
      offlineDevices,
      pendingUpdates,
      failedDeployments,
      currentRelease: currentRelease?.version || null,
      recentDeployments: recentDeployments.map((deployment) => ({
        id: deployment.id,
        deviceHostname: deployment.device?.hostname || 'Unknown',
        releaseVersion: deployment.release?.version || 'Unknown',
        status: deployment.status,
        createdAt: deployment.createdAt,
      })),
      deviceVersionDistribution,
      deploymentActivity: [...buckets.values()],
    };
  }
}
