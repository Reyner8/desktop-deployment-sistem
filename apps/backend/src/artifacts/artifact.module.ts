import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtifactController } from './artifact.controller';
import { ArtifactService } from './artifact.service';
import { ObjectStorage } from './storage/object-storage';
import { LocalStorage } from './storage/local-storage';
import { MinioStorage } from './storage/minio-storage';
import { Artifact } from './entities/artifact.entity';
import { Release } from '../releases/entities/release.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Artifact, Release]), ConfigModule],
  controllers: [ArtifactController],
  providers: [
    ArtifactService,
    {
      provide: ObjectStorage,
      useFactory: (config: ConfigService) => {
        const driver = config.get('STORAGE_DRIVER') || 'local';
        if (driver === 'minio') {
          return new MinioStorage(config);
        }
        return new LocalStorage(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [ArtifactService, ObjectStorage],
})
export class ArtifactModule {}
