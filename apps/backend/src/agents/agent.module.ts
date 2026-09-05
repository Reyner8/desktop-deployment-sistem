import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { DeviceAgentGuard } from './device-agent.guard';
import { Device } from '../devices/entities/device.entity';
import { DeviceNetwork } from '../devices/entities/device-network.entity';
import { Release } from '../releases/entities/release.entity';
import { Artifact } from '../artifacts/entities/artifact.entity';
import { Deployment } from '../deployments/entities/deployment.entity';
import { DeploymentEvent } from '../deployments/entities/deployment-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceNetwork, Release, Artifact, Deployment, DeploymentEvent]),
  ],
  controllers: [AgentController],
  providers: [AgentService, DeviceAgentGuard],
})
export class AgentModule {}