import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeploymentService } from './deployment.service';
import { DeploymentStatus, ReleaseStatus } from '@rscb/shared';

function createService(opts: { existing?: any; release?: any; device?: any } = {}) {
  const deploymentRepository = {
    findOne: jest.fn().mockResolvedValue(opts.existing ?? null),
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockImplementation(async (d: any) => ({ id: 'dep-baru', ...d })),
    findAndCount: jest.fn(),
  };
  const eventRepository = {
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockImplementation(async (d: any) => d),
  };
  const releaseRepository = {
    findOne: jest.fn().mockResolvedValue(opts.release ?? null),
  };
  const deviceRepository = {
    findOne: jest.fn().mockResolvedValue(opts.device ?? null),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new DeploymentService(
    deploymentRepository as any,
    eventRepository as any,
    releaseRepository as any,
    deviceRepository as any,
    auditService as any,
  );
  return { service, deploymentRepository, eventRepository, releaseRepository, deviceRepository, auditService };
}

function failedDeployment() {
  return {
    id: 'dep-lama',
    status: DeploymentStatus.FAILED,
    release: { id: 'rel-1', version: '1.5.0', status: ReleaseStatus.PUBLISHED },
    device: { id: 'dev-uuid-1', hostname: 'unit-01', isActive: true },
  };
}

describe('DeploymentService.retry', () => {
  it('membuat deployment baru dari PUBLISHED release dan device aktif', async () => {
    const { service, deploymentRepository, eventRepository, releaseRepository, deviceRepository, auditService } =
      createService({
        existing: failedDeployment(),
        release: { id: 'rel-1', version: '1.5.0', status: ReleaseStatus.PUBLISHED },
        device: { id: 'dev-uuid-1', hostname: 'unit-01', isActive: true },
      });

    const created = await service.retry('dep-lama', 'admin');

    expect(created.status).toBe(DeploymentStatus.PENDING);
    expect(created.release.id).toBe('rel-1');
    expect(releaseRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rel-1' } }),
    );
    expect(deviceRepository.findOne).toHaveBeenCalled();
    const event = eventRepository.save.mock.calls[0][0];
    expect(event.message).toContain('retry of dep-lama');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ details: expect.objectContaining({ retryOf: 'dep-lama' }) }),
    );
    // deployment lama tidak diubah
    expect(deploymentRepository.save.mock.calls[0][0].id).toBeUndefined();
  });

  it('menolak retry deployment yang tidak FAILED', async () => {
    const { service } = createService({
      existing: { ...failedDeployment(), status: DeploymentStatus.SUCCESS },
    });

    await expect(service.retry('dep-lama', 'admin')).rejects.toThrow(BadRequestException);
  });

  it('menolak retry ketika release tidak lagi PUBLISHED', async () => {
    const { service, releaseRepository } = createService({
      existing: failedDeployment(),
      release: { id: 'rel-1', version: '1.5.0', status: ReleaseStatus.ARCHIVED },
    });

    await expect(service.retry('dep-lama', 'admin')).rejects.toThrow(/no longer published/);
  });

  it('menolak retry ketika device tidak aktif', async () => {
    const { service, deviceRepository } = createService({
      existing: failedDeployment(),
      release: { id: 'rel-1', version: '1.5.0', status: ReleaseStatus.PUBLISHED },
      device: null,
    });

    await expect(service.retry('dep-lama', 'admin')).rejects.toThrow(/no longer active/);
  });

  it('menolak retry deployment yang tidak ada', async () => {
    const { service } = createService();

    await expect(service.retry('dep-hilang', 'admin')).rejects.toThrow(NotFoundException);
  });
});
