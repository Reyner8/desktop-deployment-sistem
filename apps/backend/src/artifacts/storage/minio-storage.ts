import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStorage } from './object-storage';

@Injectable()
export class MinioStorage extends ObjectStorage {
  constructor(private configService: ConfigService) {
    super();
  }

  async upload(file: Express.Multer.File, key: string): Promise<void> {
    throw new Error('MinIO storage not yet implemented');
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    throw new Error('MinIO storage not yet implemented');
  }

  getFilePath(key: string): string {
    throw new Error('MinIO storage does not support direct file paths');
  }

  async delete(key: string): Promise<void> {
    throw new Error('MinIO storage not yet implemented');
  }
}