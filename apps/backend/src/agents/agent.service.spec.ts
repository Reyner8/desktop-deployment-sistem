import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AgentService } from './agent.service';
import { DeploymentStatus, DeviceStatus } from '@rscb/shared';

function createService(opts: { existing?: any } = {}) {
  const deviceRepository = {
    findOne: jest.fn().mockResolvedValue(opts.existing ?? null),
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockImplementation(async (d: any) => d),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const networkRepository = {
    delete: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockResolvedValue([]),
  };
  const releaseRepository = { find: jest.fn().mockResolvedValue([]) };
  const artifactRepository = {};
  const deploymentRepository = {
    findOne: jest.fn().mockResolvedValue(opts.existing?.__deployment ?? null),
    save: jest.fn().mockImplementation(async (d: any) => d),
  };
  const eventRepository = {
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockImplementation(async (d: any) => d),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  const artifactService = {};

  const service = new AgentService(
    deviceRepository as any,
    networkRepository as any,
    releaseRepository as any,
    artifactRepository as any,
    deploymentRepository as any,
    eventRepository as any,
    artifactService as any,
    auditService as any,
  );

  return { service, deviceRepository, deploymentRepository, eventRepository, auditService };
}
describe('AgentService.register', () => {
  it('membuat token baru untuk device yang baru terdaftar', async () => {
    const { service, deviceRepository } = createService();

    const result = await service.register({
      deviceId: 'UNIT-NEW',
      hostname: 'unit-new',
      os: 'Windows 11',
      agentVersion: '1.0.0',
    } as any);

    expect(result.deviceId).toBe('UNIT-NEW');
    expect(result.token).toEqual(expect.any(String));
    expect(result.token.length).toBeGreaterThan(0);
    expect(deviceRepository.save).toHaveBeenCalled();
  });

  // Regresi: token lama device yang sudah ada ikut dikembalikan ke response,
  // sehingga siapa pun yang tahu deviceId bisa mengambil token device itu.
  it('memutar token device yang sudah terdaftar, bukan memakai token lama', async () => {
    const { service, deviceRepository } = createService();
    deviceRepository.findOne.mockResolvedValue({
      deviceId: 'UNIT-01',
      hostname: 'lama',
      token: 'token-lama-sekret',
      id: 'dev-uuid-1',
    });

    const result = await service.register({
      deviceId: 'UNIT-01',
      hostname: 'baru',
      os: 'Windows 11',
      agentVersion: '1.0.0',
    } as any);

    expect(result.token).not.toBe('token-lama-sekret');
    const saved = deviceRepository.save.mock.calls[0][0];
    expect(saved.token).toBe(result.token);
  });

  it('mencatat rotasi token di audit log', async () => {
    const { service, deviceRepository, auditService } = createService();
    deviceRepository.findOne.mockResolvedValue({
      deviceId: 'UNIT-01',
      hostname: 'lama',
      token: 'token-lama',
      id: 'dev-uuid-1',
    });

    await service.register({
      deviceId: 'UNIT-01',
      hostname: 'baru',
      os: 'Windows 11',
      agentVersion: '1.0.0',
    } as any);

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AGENT_REGISTERED',
        details: expect.objectContaining({ tokenRotated: true }),
      }),
    );
  });
});

describe('AgentService.reportDeploymentStatus', () => {
  function deploymentOf(deviceId: string, status = DeploymentStatus.ASSIGNED) {
    return {
      id: 'dep-1',
      status,
      device: { id: 'dev-uuid-1', deviceId },
      release: { version: '1.5.0' },
      events: [],
    };
  }

  // Regresi: token device A bisa menulis status deployment milik device B,
  // termasuk menandainya SUCCESS atau FAILED.
  it('menolak status dari device yang bukan pemilik deployment', async () => {
    const { service, deploymentRepository, eventRepository } = createService();
    deploymentRepository.findOne.mockResolvedValue(deploymentOf('UNIT-A'));

    await expect(
      service.reportDeploymentStatus('dep-1', 'UNIT-B', {
        status: DeploymentStatus.SUCCESS,
      } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(deploymentRepository.save).not.toHaveBeenCalled();
    expect(eventRepository.save).not.toHaveBeenCalled();
  });

  it('menerima status dari device pemilik deployment', async () => {
    const { service, deploymentRepository, eventRepository } = createService();
    deploymentRepository.findOne.mockResolvedValue(
      deploymentOf('UNIT-A', DeploymentStatus.ASSIGNED),
    );

    const result = await service.reportDeploymentStatus('dep-1', 'UNIT-A', {
      status: DeploymentStatus.DOWNLOADING,
    } as any);

    expect(result.status).toBe('ok');
    expect(deploymentRepository.save).toHaveBeenCalled();
    expect(eventRepository.save).toHaveBeenCalled();
  });

  it('tetap menolak id deployment yang tidak ada', async () => {
    const { service } = createService();

    await expect(
      service.reportDeploymentStatus('dep-hilang', 'UNIT-A', {
        status: DeploymentStatus.DOWNLOADING,
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('menolak transisi status yang tidak diizinkan', async () => {
    const { service, deploymentRepository } = createService();
    deploymentRepository.findOne.mockResolvedValue(
      deploymentOf('UNIT-A', DeploymentStatus.ASSIGNED),
    );

    await expect(
      service.reportDeploymentStatus('dep-1', 'UNIT-A', {
        status: DeploymentStatus.SUCCESS,
      } as any),
    ).rejects.toThrow(/Cannot transition/);
  });
});
