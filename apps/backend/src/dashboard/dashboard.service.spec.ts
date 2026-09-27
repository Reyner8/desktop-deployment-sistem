import { DashboardService } from './dashboard.service';
import { DeviceStatus, DeploymentStatus, ReleaseStatus } from '@rscb/shared';

function createService(opts: {
  devices?: any[];
  recent?: any[];
  activity?: any[];
  failedCount?: number;
  currentRelease?: any;
}) {
  const deviceRepository = {
    find: jest.fn().mockResolvedValue(opts.devices || []),
  };
  const releaseRepository = {
    findOne: jest.fn().mockResolvedValue(opts.currentRelease ?? null),
  };
  const deploymentRepository = {
    count: jest.fn().mockResolvedValue(opts.failedCount ?? 0),
    find: jest.fn().mockImplementation((args: any) =>
      Promise.resolve(args?.take ? opts.recent || [] : opts.activity || []),
    ),
  };
  return new DashboardService(
    deviceRepository as any,
    releaseRepository as any,
    deploymentRepository as any,
  );
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

describe('DashboardService', () => {
  it('menghitung total, online, dan offline dari lastSeen', async () => {
    const service = createService({
      devices: [
        { id: '1', applicationVersion: '1.5.0', status: DeviceStatus.ONLINE, lastSeen: new Date() },
        { id: '2', applicationVersion: '1.4.0', status: DeviceStatus.ONLINE, lastSeen: minutesAgo(30) },
        { id: '3', applicationVersion: '1.5.0', status: DeviceStatus.ONLINE, lastSeen: minutesAgo(1) },
      ],
    });

    const stats = await service.getStats();

    expect(stats.totalDevices).toBe(3);
    expect(stats.onlineDevices).toBe(2);
    expect(stats.offlineDevices).toBe(1);
    expect(stats.onlineDevices + stats.offlineDevices).toBe(stats.totalDevices);
  });

  it('hanya menghitung device yang masih terlihat sebagai pending update', async () => {
    const service = createService({
      devices: [
        { id: '1', applicationVersion: '1.4.0', status: DeviceStatus.UPDATE_AVAILABLE, lastSeen: new Date() },
        { id: '2', applicationVersion: '1.4.0', status: DeviceStatus.UPDATE_AVAILABLE, lastSeen: minutesAgo(60) },
        { id: '3', applicationVersion: '1.5.0', status: DeviceStatus.ONLINE, lastSeen: new Date() },
      ],
    });

    const stats = await service.getStats();

    expect(stats.pendingUpdates).toBe(1);
  });

  it('membuat bucket aktivitas 7 hari dengan hari kosong tetap terisi nol', async () => {
    const service = createService({
      activity: [{ id: 'd1', status: DeploymentStatus.SUCCESS, createdAt: new Date() }],
    });

    const stats = await service.getStats();

    expect(stats.deploymentActivity).toHaveLength(7);
    expect(stats.deploymentActivity[6].total).toBe(1);
    expect(stats.deploymentActivity[6].success).toBe(1);
    expect(stats.deploymentActivity[0].total).toBe(0);

    const dates = stats.deploymentActivity.map((b) => b.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
    expect(dates[6]).toBe(new Date().toISOString().slice(0, 10));
  });

  it('mengurutkan distribusi versi dari yang terbanyak dan membatasinya', async () => {
    const service = createService({
      devices: [
        { id: '1', applicationVersion: '1.5.0', status: DeviceStatus.ONLINE, lastSeen: new Date() },
        { id: '2', applicationVersion: '1.5.0', status: DeviceStatus.ONLINE, lastSeen: new Date() },
        { id: '3', applicationVersion: '1.4.0', status: DeviceStatus.ONLINE, lastSeen: new Date() },
        { id: '4', applicationVersion: null, status: DeviceStatus.ONLINE, lastSeen: new Date() },
      ],
    });

    const stats = await service.getStats();

    expect(stats.deviceVersionDistribution).toEqual([
      { version: '1.5.0', count: 2 },
      { version: '1.4.0', count: 1 },
      { version: 'Unknown', count: 1 },
    ]);
  });

  it('menyiapkan rilis aktif dan jumlah deployment gagal', async () => {
    const service = createService({
      failedCount: 4,
      currentRelease: { version: '1.6.0', status: ReleaseStatus.PUBLISHED },
      recent: [
        {
          id: 'd1',
          status: DeploymentStatus.FAILED,
          createdAt: new Date(),
          device: { hostname: 'UNIT-01' },
          release: { version: '1.6.0' },
        },
      ],
    });

    const stats = await service.getStats();

    expect(stats.currentRelease).toBe('1.6.0');
    expect(stats.failedDeployments).toBe(4);
    expect(stats.recentDeployments[0]).toMatchObject({
      id: 'd1',
      deviceHostname: 'UNIT-01',
      releaseVersion: '1.6.0',
      status: DeploymentStatus.FAILED,
    });
  });
});
