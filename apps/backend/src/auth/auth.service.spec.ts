import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRole } from '@rscb/shared';

function createService(opts: { existing?: any; users?: any[] } = {}) {
  const users = opts.users ?? [];
  const userRepository = {
    // Clone hasil lookup: service memutasi object user (mis. saat mengubah
    // role) — tanpa clone, mutasi bocor ke test berikutnya yang memakai
    // object yang sama.
    findOne: jest.fn().mockImplementation(({ where }) => {
      const found = opts.existing
        ? opts.existing
        : users.find((u) => u.id === where.id || u.username === where.username);
      return Promise.resolve(found ? { ...found } : null);
    }),
    find: jest.fn().mockResolvedValue(users),
    count: jest.fn().mockImplementation(({ where }) => {
      // Not() dari typeorm adalah FindOperator dengan .value
      const excludeId = typeof where.id === 'object' && where.id !== null ? where.id.value : where.id;
      return Promise.resolve(users.filter((u) => u.role === where.role && u.id !== excludeId).length);
    }),
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockImplementation(async (d: any) => d),
    remove: jest.fn().mockResolvedValue(undefined),
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

describe('AuthService — manajemen role', () => {
  const admin = { id: 'u1', username: 'admin', role: UserRole.ADMIN, isActive: true };
  const operator = { id: 'u2', username: 'operator', role: UserRole.OPERATOR, isActive: true };

  it('login menyertakan role di payload JWT', async () => {
    const { service } = createService({ users: [admin] });

    await service.login(admin);

    // sign dipanggil dengan payload berisi role
    const payload = (service as any).jwtService.sign.mock.calls[0][0] as any;
    expect(payload.role).toBe(UserRole.ADMIN);
  });

  it('register default OPERATOR bila role tidak diisi', async () => {
    const { service, userRepository } = createService();

    await service.register('baru', 'password-aman', undefined);

    const created = userRepository.create.mock.calls[0][0];
    expect(created.role).toBe(UserRole.OPERATOR);
  });

  it('seedAdmin membuat user dengan role ADMIN', async () => {
    const { service, userRepository } = createService();
    (service as any).configService = {
      get: (key: string) => (key === 'ADMIN_PASSWORD' ? 'password-aman' : undefined),
    };

    await service.seedAdmin();

    const created = userRepository.create.mock.calls[0][0];
    expect(created.role).toBe(UserRole.ADMIN);
  });

  it('updateUserRole mengubah role operator menjadi admin', async () => {
    const { service } = createService({ users: [admin, operator] });

    const result = await service.updateUserRole('u2', UserRole.ADMIN);

    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('menolak mencabut ADMIN terakhir', async () => {
    const { service } = createService({ users: [admin, operator] });

    await expect(service.updateUserRole('u1', UserRole.OPERATOR)).rejects.toThrow(
      /last administrator/,
    );
  });

  it('mengizinkan demote bila masih ada ADMIN lain', async () => {
    const admin2 = { ...admin, id: 'u3', username: 'admin2' };
    const { service } = createService({ users: [admin, admin2, operator] });

    const result = await service.updateUserRole('u1', UserRole.OPERATOR);

    expect(result.role).toBe(UserRole.OPERATOR);
  });

  it('deleteUser menolak menghapus diri sendiri dan ADMIN terakhir', async () => {
    const { service } = createService({ users: [admin] });

    await expect(service.deleteUser('u1', 'admin')).rejects.toThrow(/own account/);
    await expect(service.deleteUser('u1', 'orang-lain')).rejects.toThrow(/last administrator/);
  });

  it('deleteUser menolak user yang tidak ada', async () => {
    const { service } = createService({ users: [admin] });

    await expect(service.deleteUser('u-hilang', 'admin')).rejects.toThrow(NotFoundException);
  });

  it('updateUserRole menolak user yang tidak ada', async () => {
    const { service } = createService({ users: [admin] });

    await expect(service.updateUserRole('u-hilang', UserRole.ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });
});

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
