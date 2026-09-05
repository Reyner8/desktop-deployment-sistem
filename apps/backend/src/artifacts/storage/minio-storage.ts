import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { ObjectStorage } from './object-storage';

@Injectable()
export class MinioStorage extends ObjectStorage implements OnModuleInit {
  private readonly logger = new Logger(MinioStorage.name);
  private client: Minio.Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    super();
    this.bucket = this.configService.get('MINIO_BUCKET') || 'rscb-artifacts';
    this.publicUrl = this.configService.get('MINIO_PUBLIC_URL') || '';
  }

  onModuleInit() {
    const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
    const port = parseInt(this.configService.get('MINIO_PORT') || '9000', 10);
    const accessKey = this.configService.get('MINIO_ACCESS_KEY') || 'minioadmin';
    const secretKey = this.configService.get('MINIO_SECRET_KEY') || 'minioadmin';
    const useSSL = this.configService.get('MINIO_USE_SSL') === 'true';

    this.client = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });

    this.ensureBucket().catch((err) => {
      this.logger.error(`Failed to ensure bucket: ${err.message}`);
    });
  }

  private async ensureBucket(retries = 5, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const exists = await this.client.bucketExists(this.bucket);
        if (!exists) {
          await this.client.makeBucket(this.bucket);
          this.logger.log(`Bucket "${this.bucket}" created`);
        } else {
          this.logger.log(`Bucket "${this.bucket}" already exists`);
        }
        return;
      } catch (err) {
        this.logger.warn(
          `Bucket check attempt ${attempt}/${retries} failed: ${err.message}`,
        );
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    this.logger.error(`Could not ensure bucket after ${retries} attempts`);
  }

  async upload(file: Express.Multer.File, key: string): Promise<void> {
    await this.client.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const url = await this.client.presignedGetObject(this.bucket, key, expiresIn);
    if (this.publicUrl) {
      const parsed = new URL(url);
      const publicParsed = new URL(this.publicUrl);
      parsed.host = publicParsed.host;
      parsed.protocol = publicParsed.protocol;
      return parsed.toString();
    }
    return url;
  }

  getFilePath(key: string): string {
    throw new Error('MinIO storage does not support direct file paths');
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
