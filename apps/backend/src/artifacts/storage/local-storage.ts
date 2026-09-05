import { Injectable } from '@nestjs/common';
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

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    return `/api/v1/artifacts/file/${key}`;
  }

  getFilePath(key: string): string {
    return path.join(this.uploadDir, 'artifacts', key);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}