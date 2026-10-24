import { UnauthorizedException } from '@nestjs/common';
import { DeviceAgentGuard } from './device-agent.guard';
import { hashDeviceToken } from '../common/token-hash.util';
import { DeviceStatus } from '@rscb/shared';

function createContext(headerValue?: string) {
  const request = { headers: headerValue ? { 'x-api-key': headerValue } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

function createGuard(opts: { byHash?: any; byPlain?: any } = {}) {
  const deviceRepository = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.token.length === 64) {
        return Promise.resolve(opts.byHash ?? null);
      }
      return Promise.resolve(opts.byPlain ?? null);
    }),
    save: jest.fn().mockImplementation(async (d: any) => d),
  };
  const guard = new DeviceAgentGuard(deviceRepository as never);
  return { guard, deviceRepository };
}

const device = {
  id: 'dev-1',
  deviceId: 'UNIT-01',
  token: hashDeviceToken('token-abc'),
  status: DeviceStatus.ONLINE,
  isActive: true,
};

describe('DeviceAgentGuard', () => {
  it('menerima token yang hashnya ada di database', async () => {
    const { guard, deviceRepository } = createGuard({ byHash: device });

    const result = await guard.canActivate(createContext('token-abc'));

    expect(result).toBe(true);
    expect(deviceRepository.findOne).toHaveBeenCalledWith({
      where: { token: hashDeviceToken('token-abc') },
    });
  });

  it('menolak device yang dinonaktifkan walau token masih sah', async () => {
    const { guard } = createGuard({ byHash: { ...device, isActive: false } });

    await expect(guard.canActivate(createContext('token-abc'))).rejects.toThrow(
      /deactivated/,
    );
  });

  it('menolak request tanpa header x-api-key', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(createContext(undefined))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('menolak token yang tidak dikenal', async () => {
    const { guard, deviceRepository } = createGuard();

    await expect(guard.canActivate(createContext('token-asing'))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(deviceRepository.save).not.toHaveBeenCalled();
  });

  // Masa transisi: device yang terdaftar sebelum token di-hash masih
  // menyimpan token plaintext. Request pertamanya harus tetap sah dan
  // sekaligus meng-upgrade kolom token ke hash.
  it('menerima token legacy plaintext dan meng-upgrade-nya ke hash', async () => {
    const legacyDevice = { ...device, token: 'token-lama-plaintext' };
    const { guard, deviceRepository } = createGuard({ byPlain: legacyDevice });

    const result = await guard.canActivate(createContext('token-lama-plaintext'));

    expect(result).toBe(true);
    const saved = deviceRepository.save.mock.calls[0][0];
    expect(saved.token).toBe(hashDeviceToken('token-lama-plaintext'));
  });
});
