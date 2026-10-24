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
  const releaseRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };
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
  const artifactService = {
    isLocalStorage: jest.fn().mockReturnValue(false),
    getDownloadUrl: jest.fn().mockResolvedValue('http://minio/presigned'),
  };

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

  return {
    service,
    deviceRepository,
    networkRepository,
    releaseRepository,
    deploymentRepository,
    eventRepository,
    auditService,
    artifactService,
  };
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

  // Perilaku baru (server toleran): SUCCESS/FAILED adalah laporan hasil
  // akhir dari device yang benar-benar menjalankan instalasi, sehingga
  // diterima dari status aktif mana pun. Tanpa ini deployment bisa
  // menggantung selamanya ketika laporan antara tidak sempat diterima
  // server (agent mati/restart di tengah alur).
  it('menerima laporan SUCCESS dari ASSIGNED sebagai lompatan terminal', async () => {
    const { service, deploymentRepository, eventRepository, deviceRepository } = createService();
    deploymentRepository.findOne.mockResolvedValue(
      deploymentOf('UNIT-A', DeploymentStatus.ASSIGNED),
    );

    const result = await service.reportDeploymentStatus('dep-1', 'UNIT-A', {
      status: DeploymentStatus.SUCCESS,
      message: 'Instalasi selesai',
    } as any);

    expect(result.status).toBe('ok');
    expect(deploymentRepository.save).toHaveBeenCalled();
    const event = eventRepository.save.mock.calls[0][0];
    expect(event.status).toBe(DeploymentStatus.SUCCESS);
    expect(event.message).toContain('lompatan dari ASSIGNED');
    expect(deviceRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: DeviceStatus.ONLINE }),
    );
  });

  it('menerima laporan FAILED dari status aktif dan menandai device ERROR', async () => {
    const { service, deploymentRepository, deviceRepository } = createService();
    deploymentRepository.findOne.mockResolvedValue(
      deploymentOf('UNIT-A', DeploymentStatus.DOWNLOADING),
    );

    const result = await service.reportDeploymentStatus('dep-1', 'UNIT-A', {
      status: DeploymentStatus.FAILED,
      errorMessage: 'download gagal',
    } as any);

    expect(result.status).toBe('ok');
    expect(deploymentRepository.save).toHaveBeenCalled();
    expect(deviceRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: DeviceStatus.ERROR }),
    );
  });

  it('laporan duplikat dijawab no-op tanpa mengubah state', async () => {
    const { service, deploymentRepository, eventRepository } = createService();
    deploymentRepository.findOne.mockResolvedValue(
      deploymentOf('UNIT-A', DeploymentStatus.DOWNLOADING),
    );

    const result = await service.reportDeploymentStatus('dep-1', 'UNIT-A', {
      status: DeploymentStatus.DOWNLOADING,
    } as any);

    expect(result.status).toBe('ok');
    expect(deploymentRepository.save).not.toHaveBeenCalled();
    expect(eventRepository.save).not.toHaveBeenCalled();
  });

  it('laporan stale (di belakang status server) dijawab no-op', async () => {
    const { service, deploymentRepository, eventRepository } = createService();
    deploymentRepository.findOne.mockResolvedValue(
      deploymentOf('UNIT-A', DeploymentStatus.INSTALLING),
    );

    const result = await service.reportDeploymentStatus('dep-1', 'UNIT-A', {
      status: DeploymentStatus.VERIFYING,
    } as any);

    expect(result.status).toBe('ok');
    expect(deploymentRepository.save).not.toHaveBeenCalled();
    expect(eventRepository.save).not.toHaveBeenCalled();
  });

  it('laporan ke deployment terminal dijawab no-op apa pun statusnya', async () => {
    const { service, deploymentRepository, eventRepository } = createService();
    deploymentRepository.findOne.mockResolvedValue(
      deploymentOf('UNIT-A', DeploymentStatus.SUCCESS),
    );

    const result = await service.reportDeploymentStatus('dep-1', 'UNIT-A', {
      status: DeploymentStatus.FAILED,
    } as any);

    expect(result.status).toBe('ok');
    expect(deploymentRepository.save).not.toHaveBeenCalled();
    expect(eventRepository.save).not.toHaveBeenCalled();
  });

  it('tetap menolak lompatan non-terminal yang tidak diizinkan', async () => {
    const { service, deploymentRepository } = createService();
    deploymentRepository.findOne.mockResolvedValue(
      deploymentOf('UNIT-A', DeploymentStatus.ASSIGNED),
    );

    await expect(
      service.reportDeploymentStatus('dep-1', 'UNIT-A', {
        status: DeploymentStatus.INSTALLING,
      } as any),
    ).rejects.toThrow(/Cannot transition/);
  });
});

describe('AgentService.getUpdates', () => {
  function deviceOf(applicationVersion: string | null) {
    return { id: 'dev-uuid-1', deviceId: 'UNIT-A', applicationVersion };
  }

  // Regresi: deployment yang terlewat (agent mati di tengah alur) tidak
  // pernah dikirim ulang karena getUpdates hanya mencari PENDING/ASSIGNED,
  // sehingga deployment DOWNLOADING/INSTALLING menggantung selamanya.
  it('mengirim deployment aktif walau tidak ada update versi', async () => {
    const { service, deviceRepository, releaseRepository, deploymentRepository } = createService();
    deviceRepository.findOne.mockResolvedValue(deviceOf('2.0.0'));
    releaseRepository.find.mockResolvedValue([
      { id: 'rel-2', version: '2.0.0', artifact: {} },
    ]);
    deploymentRepository.findOne.mockResolvedValue({
      id: 'dep-1',
      status: DeploymentStatus.INSTALLING,
      release: { id: 'rel-9', version: '1.9.0' },
    });

    const result = await service.getUpdates('UNIT-A');

    expect(result.hasUpdate).toBe(false);
    expect(result.deploymentId).toBe('dep-1');
    expect(result.deploymentStatus).toBe(DeploymentStatus.INSTALLING);
    // Artifact mengikuti release deployment, bukan release terbaru.
    expect(result.downloadUrl).toBe('/api/v1/agents/artifacts/rel-9/download-url');
    expect(result.targetVersion).toBe('1.9.0');
  });

  it('mengklaim deployment PENDING menjadi ASSIGNED saat dikirim', async () => {
    const { service, deviceRepository, releaseRepository, deploymentRepository, eventRepository } =
      createService();
    deviceRepository.findOne.mockResolvedValue(deviceOf('1.0.0'));
    releaseRepository.find.mockResolvedValue([
      { id: 'rel-2', version: '2.0.0', artifact: {} },
    ]);
    deploymentRepository.findOne.mockResolvedValue({
      id: 'dep-1',
      status: DeploymentStatus.PENDING,
      release: { id: 'rel-2', version: '2.0.0' },
    });

    const result = await service.getUpdates('UNIT-A');

    expect(result.deploymentStatus).toBe(DeploymentStatus.ASSIGNED);
    const saved = deploymentRepository.save.mock.calls[0][0];
    expect(saved.status).toBe(DeploymentStatus.ASSIGNED);
    expect(eventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: DeploymentStatus.ASSIGNED }),
    );
  });

  it('tanpa release dan tanpa deployment tetap mengembalikan bentuk response lengkap', async () => {
    const { service, deviceRepository } = createService();
    deviceRepository.findOne.mockResolvedValue(deviceOf('1.0.0'));

    const result = await service.getUpdates('UNIT-A');

    expect(result).toEqual({
      hasUpdate: false,
      latestVersion: null,
      downloadUrl: null,
      deploymentId: null,
      targetVersion: null,
      deploymentStatus: null,
    });
  });
});

describe('AgentService.getDownloadUrl', () => {
  // Regresi: agent wajib memverifikasi SHA-256 setelah download, tetapi
  // response download-url tidak membawa checksum sehingga verifikasi
  // tidak mungkin dilakukan dari sisi agent.
  it('menyertakan fileName, size, dan sha256 artifact pada response (driver minio)', async () => {
    const { service, releaseRepository, artifactService } = createService();
    releaseRepository.findOne.mockResolvedValue({
      id: 'rel-1',
      status: 'PUBLISHED',
      artifact: {
        fileName: 'simrs-1.5.0.zip',
        size: '524288000',
        sha256: 'a'.repeat(64),
      },
    });

    const result = await service.getDownloadUrl('rel-1');

    expect(result.downloadUrl).toBe('http://minio/presigned');
    expect(result.fileName).toBe('simrs-1.5.0.zip');
    expect(result.size).toBe(524288000);
    expect(result.sha256).toBe('a'.repeat(64));
    expect(artifactService.getDownloadUrl).toHaveBeenCalled();
  });

  it('menyertakan metadata artifact pada jalur storage lokal', async () => {
    const { service, releaseRepository, artifactService } = createService();
    artifactService.isLocalStorage.mockReturnValue(true);
    releaseRepository.findOne.mockResolvedValue({
      id: 'rel-1',
      status: 'PUBLISHED',
      artifact: {
        fileName: 'simrs-2.0.0.zip',
        size: 1024,
        sha256: 'b'.repeat(64),
      },
    });

    const result = await service.getDownloadUrl('rel-1');

    expect(result.downloadUrl).toBe('/api/v1/agents/artifacts/rel-1/file');
    expect(result.fileName).toBe('simrs-2.0.0.zip');
    expect(result.size).toBe(1024);
    expect(result.sha256).toBe('b'.repeat(64));
  });
});
