import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LocalStorage } from './local-storage';

describe('LocalStorage', () => {
  let uploadDir: string;
  let storage: LocalStorage;

  beforeEach(() => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rscb-local-storage-'));
    storage = new LocalStorage({
      get: (key: string) => (key === 'UPLOAD_DIR' ? uploadDir : undefined),
    } as any);
  });

  afterEach(() => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  it('mengembalikan stream berisi file yang ada', async () => {
    const key = 'SIMRS/1.5.0/1.5.0.zip';
    const filePath = path.join(uploadDir, 'artifacts', key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'isi-artifact');

    const stream = await storage.getReadStream(key);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    expect(Buffer.concat(chunks).toString()).toBe('isi-artifact');
  });

  // Regresi: file tidak ada dulu membuat fs.createReadStream melempar event
  // "error" yang tidak tertangani sehingga seluruh proses backend mati.
  it('melempar NotFoundException bila file tidak ada', async () => {
    await expect(storage.getReadStream('SIMRS/9.9.3/9.9.3.zip')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('menolak key yang keluar dari uploadDir', async () => {
    await expect(storage.getReadStream('../../../etc/passwd')).rejects.toThrow(
      NotFoundException,
    );
  });

  // Containment harus berlaku di sisi tulis juga, bukan hanya di sisi baca.
  // Key dibentuk dari input CI (application, version, fileName).
  it('menolak upload dengan key yang keluar dari uploadDir', async () => {
    const file = { buffer: Buffer.from('payload') } as Express.Multer.File;

    await expect(storage.upload(file, '../escaped.zip')).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      storage.upload(file, 'SIMRS/../../escaped.zip'),
    ).rejects.toThrow(BadRequestException);
    expect(fs.existsSync(path.join(uploadDir, 'escaped.zip'))).toBe(false);
  });

  it('menolak key kosong yang akan menunjuk ke root artifacts', () => {
    expect(() => storage.getFilePath('')).toThrow(BadRequestException);
    expect(() => storage.getFilePath('.')).toThrow(BadRequestException);
  });

  it('menolak delete dengan key yang keluar dari uploadDir', async () => {
    const outside = path.join(uploadDir, 'outside.bin');
    fs.writeFileSync(outside, 'data');

    await expect(storage.delete('../outside.bin')).rejects.toThrow(
      BadRequestException,
    );
    expect(fs.existsSync(outside)).toBe(true);
  });

  it('menolak composeParts dengan partKey di luar uploadDir', async () => {
    const outside = path.join(uploadDir, 'outside.bin');
    fs.writeFileSync(outside, 'data');

    await expect(
      storage.composeParts(['../outside.bin'], '../final.zip'),
    ).rejects.toThrow(BadRequestException);
    expect(fs.existsSync(outside)).toBe(true);
  });

  it('menulis artifact pada key yang valid', async () => {
    const file = { buffer: Buffer.from('isi-artifact') } as Express.Multer.File;
    const key = 'SIMRS/1.5.0/1.5.0.zip';

    await storage.upload(file, key);

    const written = path.join(uploadDir, 'artifacts', key);
    expect(fs.readFileSync(written, 'utf-8')).toBe('isi-artifact');
  });
});
