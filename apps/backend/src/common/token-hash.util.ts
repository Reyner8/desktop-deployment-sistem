import { createHash } from 'crypto';

/**
 * Hash token device sebelum disimpan di database. Token plaintext hanya
 * pernah muncul di response registrasi; server tidak menyimpannya, jadi
 * bocornya isi tabel devices tidak langsung memberi akses sebagai device.
 * Hash polos (tanpa pepper) cukup karena token itu UUID acuan 122-bit —
 * tidak menebak dari hashnya.
 */
export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
