import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtifactController } from './artifact.controller';
import { ArtifactService } from './artifact.service';
import { ObjectStorage } from './storage/object-storage';
import { LocalStorage } from './storage/local-storage';
import { Artifact } from './entities/artifact.entity';
import { Release } from '../releases/entities/release.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Artifact, Release]), ConfigModule],
  controllers: [ArtifactController],
  providers: [
    ArtifactService,
    {
      provide: ObjectStorage,
      useClass: LocalStorage,
    },
  ],
  exports: [ArtifactService, ObjectStorage],
})
export class ArtifactModule {}