import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseController } from './release.controller';
import { ReleaseService } from './release.service';
import { Release } from './entities/release.entity';
import { Artifact } from '../artifacts/entities/artifact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Release, Artifact])],
  controllers: [ReleaseController],
  providers: [ReleaseService],
  exports: [ReleaseService],
})
export class ReleaseModule {}