import { NotFoundException } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceStatus } from '@rscb/shared';

function createService(opts: { existing?: any } = {}) {
  const deviceRepository = {
    findOne: jest.fn().mockResolvedValue(opts.existing ?? null),
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockImplementation(async (d: any) => d),
    findAndCount: jest.fn(),
  };
  const networkRepository = {};
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new DeviceService(
    deviceRepository as any,
    networkRepository as any,
    auditService as any,
  );
  return { service, deviceRepository, auditService };
}

const activeDevice = {
  id: 'dev-1',
  deviceId: 'UNIT-01',
  hostname: 'unit-01',
  status: DeviceStatus.ONLINE,
  isActive: true,
  token: 'hash-token',
};

describe('DeviceService.setActive', () => {
  it('menonaktifkan device sekaligus mencabut token-nya', async () => {
    const { service, deviceRepository, auditService } = createService({
      existing: { ...activeDevice },
    });

    const result = await service.setActive('dev-1', false, 'admin');

    expect(result.isActive).toBe(false);
    expect(result.token).toBeNull();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEVICE_DEACTIVATED' }),
    );
  });

  it('mengaktifkan kembali tanpa membuat token baru', async () => {
    const { service } = createService({
      existing: { ...activeDevice, isActive: false, token: null },
    });

    const result = await service.setActive('dev-1', true, 'admin');

    expect(result.isActive).toBe(true);
    expect(result.token).toBeNull();
  });

  it('no-op bila status aktif sudah sesuai', async () => {
    const { service, deviceRepository } = createService({
      existing: { ...activeDevice },
    });

    await service.setActive('dev-1', true, 'admin');

    expect(deviceRepository.save).not.toHaveBeenCalled();
  });

  it('menolak device yang tidak ada', async () => {
    const { service } = createService();

    await expect(service.setActive('dev-hilang', false, 'admin')).rejects.toThrow(
      NotFoundException,
    );
  });
});
