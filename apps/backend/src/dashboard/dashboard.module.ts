import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Device } from '../devices/entities/device.entity';
import { Release } from '../releases/entities/release.entity';
import { Deployment } from '../deployments/entities/deployment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Device, Release, Deployment])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
