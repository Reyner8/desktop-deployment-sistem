import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CiController } from './ci.controller';
import { CiService } from './ci.service';
import { UploadSession } from './entities/upload-session.entity';
import { Release } from '../releases/entities/release.entity';
import { ReleaseModule } from '../releases/release.module';
import { ArtifactModule } from '../artifacts/artifact.module';
import { CiAuthGuard } from '../common/guards/ci-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UploadSession, Release]),
    ReleaseModule,
    ArtifactModule,
  ],
  controllers: [CiController],
  providers: [CiService, CiAuthGuard],
})
export class CiModule {}