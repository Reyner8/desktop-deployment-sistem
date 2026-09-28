import { BadRequestException } from '@nestjs/common';
import { resolveOrder } from './sort.util';

const ALLOWED = ['status', 'createdAt', 'updatedAt'] as const;

describe('resolveOrder', () => {
  it('memakai defaultField bila sort tidak diisi', () => {
    expect(resolveOrder(undefined, ALLOWED, 'createdAt')).toEqual({ createdAt: 'DESC' });
    expect(resolveOrder('', ALLOWED, 'createdAt')).toEqual({ createdAt: 'DESC' });
  });

  it('hormati arah ASC dan DESC', () => {
    expect(resolveOrder('status', ALLOWED, 'createdAt', 'ASC')).toEqual({ status: 'ASC' });
    expect(resolveOrder('status', ALLOWED, 'createdAt', 'DESC')).toEqual({ status: 'DESC' });
  });

  it('default ke DESC untuk arah yang tidak dikenal', () => {
    expect(resolveOrder('status', ALLOWED, 'createdAt', 'NAIK')).toEqual({ status: 'DESC' });
    expect(resolveOrder('status', ALLOWED, 'createdAt', 'asc')).toEqual({ status: 'DESC' });
  });

  it('menerima kolom yang ada di whitelist', () => {
    expect(resolveOrder('createdAt', ALLOWED, 'createdAt', 'ASC')).toEqual({
      createdAt: 'ASC',
    });
    expect(resolveOrder('updatedAt', ALLOWED, 'createdAt', 'ASC')).toEqual({
      updatedAt: 'ASC',
    });
  });

  // Nama kolom dilempar mentah ke TypeORM, jadi kolom di luar whitelist harus
  // ditolak, termasuk kolom sensitif yang tidak pernah ditampilkan.
  it('menolak kolom di luar whitelist', () => {
    expect(() => resolveOrder('token', ALLOWED, 'createdAt')).toThrow(BadRequestException);
    expect(() => resolveOrder('password', ALLOWED, 'createdAt')).toThrow(BadRequestException);
    expect(() => resolveOrder('device', ALLOWED, 'createdAt')).toThrow(BadRequestException);
  });

  it('menolak upaya menyamarkan kolom dengan nama mirip', () => {
    expect(() => resolveOrder('createdAt; DROP TABLE users', ALLOWED, 'createdAt')).toThrow(
      BadRequestException,
    );
    expect(() => resolveOrder('createdAt, token', ALLOWED, 'createdAt')).toThrow(
      BadRequestException,
    );
    expect(() => resolveOrder('createdAt ', ALLOWED, 'createdAt')).toThrow(
      BadRequestException,
    );
  });

  it('pesan error mencantumkan daftar kolom yang diizinkan', () => {
    expect(() => resolveOrder('token', ALLOWED, 'createdAt')).toThrow(
      /Allowed fields: status, createdAt, updatedAt/,
    );
  });
});
