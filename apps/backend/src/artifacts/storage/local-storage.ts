import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { ObjectStorage } from './object-storage';

@Injectable()
export class LocalStorage extends ObjectStorage {
  private rootDir: string;

  constructor(private configService: ConfigService) {
    super();
    this.rootDir = path.resolve(
      this.configService.get('UPLOAD_DIR') || './uploads',
      'artifacts',
    );
    fs.mkdirSync(this.rootDir, { recursive: true });
  }

  async upload(file: Express.Multer.File, key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file.buffer);
  }

  getFilePath(key: string): string {
    return this.resolveInsideRoot(key);
  }

  /**
   * Semua operasi filesystem harus lewat sini. Object key pada driver ini
   * berasal dari input eksternal (upload CI, parameter URL), sehingga tanpa
   * pengecekan ini key seperti "../../etc/cron.d/x" dapat menulis/menghapus
   * file di luar uploadDir.
   */
  private resolveInsideRoot(key: string): string {
    const filePath = path.resolve(this.rootDir, key);
    const inside = filePath.startsWith(this.rootDir + path.sep);
    if (!inside) {
      throw new BadRequestException('Invalid artifact storage key');
    }
    return filePath;
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/api/v1/artifacts/file/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async composeParts(partKeys: string[], objectKey: string): Promise<void> {
    const finalPath = this.getFilePath(objectKey);
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    for (const key of partKeys) {
      const partPath = this.getFilePath(key);
      fs.appendFileSync(finalPath, fs.readFileSync(partPath));
      fs.unlinkSync(partPath);
    }
    if (partKeys.length > 0) {
      try {
        fs.rmdirSync(path.dirname(this.getFilePath(partKeys[0])));
      } catch {
        // ignore
      }
    }
  }

  async getReadStream(key: string): Promise<NodeJS.ReadableStream> {
    // Key di luar root diperlakukan sama dengan file yang tidak ada supaya
    // endpoint baca tidak membocorkan keberadaan path di luar uploadDir.
    let filePath: string;
    try {
      filePath = this.resolveInsideRoot(key);
    } catch {
      throw new NotFoundException('Artifact not found');
    }

    // fs.createReadStream gagal secara asinkron lewat event "error" bila file
    // tidak ada. Stream hasil pipe() tidak meneruskan event error tersebut,
    // sehingga tanpa listener proses backend mati. Cek dulu di sini agar
    // berubah menjadi 404 yang ditangani NestJS.
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      throw new NotFoundException('Artifact not found');
    }
    if (!stat.isFile()) {
      throw new NotFoundException('Artifact not found');
    }

    return fs.createReadStream(filePath);
  }
}