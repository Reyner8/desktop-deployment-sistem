import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

function createService(opts: { existing?: any } = {}) {
  const userRepository = {
    findOne: jest.fn().mockResolvedValue(opts.existing ?? null),
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockImplementation(async (d: any) => d),
  };
  const jwtService = { sign: jest.fn().mockReturnValue('jwt-token') };
  const configService = { get: jest.fn() };
  const service = new AuthService(
    userRepository as any,
    jwtService as any,
    configService as any,
  );
  return { service, userRepository };
}

describe('AuthService.changePassword', () => {
  it('mengganti password ketika password lama cocok', async () => {
    const oldHash = await bcrypt.hash('lama1234', 10);
    const { service, userRepository } = createService({
      existing: { id: 'user-1', username: 'admin', password: oldHash, isActive: true },
    });

    await service.changePassword('user-1', 'lama1234', 'baru1234');

    const saved = userRepository.save.mock.calls[0][0];
    expect(await bcrypt.compare('baru1234', saved.password)).toBe(true);
    expect(await bcrypt.compare('lama1234', saved.password)).toBe(false);
  });

  it('menolak ketika password lama salah dan tidak menyimpan apa pun', async () => {
    const oldHash = await bcrypt.hash('lama1234', 10);
    const { service, userRepository } = createService({
      existing: { id: 'user-1', username: 'admin', password: oldHash, isActive: true },
    });

    await expect(
      service.changePassword('user-1', 'password-salah', 'baru1234'),
    ).rejects.toThrow(UnauthorizedException);

    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('menolak user yang tidak ada', async () => {
    const { service } = createService();

    await expect(
      service.changePassword('user-hilang', 'lama1234', 'baru1234'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
