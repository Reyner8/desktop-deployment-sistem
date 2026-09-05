import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeploymentController } from './deployment.controller';
import { DeploymentService } from './deployment.service';
import { Deployment } from './entities/deployment.entity';
import { DeploymentEvent } from './entities/deployment-event.entity';
import { Release } from '../releases/entities/release.entity';
import { Device } from '../devices/entities/device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Deployment, DeploymentEvent, Release, Device])],
  controllers: [DeploymentController],
  providers: [DeploymentService],
})
export class DeploymentModule {}