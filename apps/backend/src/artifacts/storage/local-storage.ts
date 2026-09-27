import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { ObjectStorage } from './object-storage';

@Injectable()
export class LocalStorage extends ObjectStorage {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    super();
    this.uploadDir = this.configService.get('UPLOAD_DIR') || './uploads';
    fs.mkdirSync(path.join(this.uploadDir, 'artifacts'), { recursive: true });
  }

  async upload(file: Express.Multer.File, key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file.buffer);
  }

  getFilePath(key: string): string {
    return path.join(this.uploadDir, 'artifacts', key);
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
    const filePath = this.getFilePath(key);
    const rootDir = path.resolve(this.uploadDir, 'artifacts');

    // Cegah path traversal (key "a/../../b" akan keluar dari uploadDir).
    if (!path.resolve(filePath).startsWith(rootDir + path.sep)) {
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