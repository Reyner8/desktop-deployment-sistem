import { createHash } from 'crypto';
import { hashDeviceToken } from './token-hash.util';

describe('hashDeviceToken', () => {
  it('menghasilkan sha256 hex 64 karakter', () => {
    const hash = hashDeviceToken('token-abc');

    expect(hash).toHaveLength(64);
    expect(hash).toBe(createHash('sha256').update('token-abc').digest('hex'));
  });

  it('deterministik untuk token yang sama dan berbeda untuk token lain', () => {
    expect(hashDeviceToken('a')).toBe(hashDeviceToken('a'));
    expect(hashDeviceToken('a')).not.toBe(hashDeviceToken('b'));
  });
});
