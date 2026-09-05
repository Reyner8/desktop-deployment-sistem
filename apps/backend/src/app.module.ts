import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './auth/auth.module';
import { AgentModule } from './agents/agent.module';
import { DeviceModule } from './devices/device.module';
import { ReleaseModule } from './releases/release.module';
import { ArtifactModule } from './artifacts/artifact.module';
import { DeploymentModule } from './deployments/deployment.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { User } from './auth/entities/user.entity';
import { Device } from './devices/entities/device.entity';
import { DeviceNetwork } from './devices/entities/device-network.entity';
import { Release } from './releases/entities/release.entity';
import { Artifact } from './artifacts/entities/artifact.entity';
import { Deployment } from './deployments/entities/deployment.entity';
import { DeploymentEvent } from './deployments/entities/deployment-event.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { CreateInitialSchema1720000000000 } from './database/migrations/1720000000000-CreateInitialSchema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [
          User, Device, DeviceNetwork, Release, Artifact,
          Deployment, DeploymentEvent, AuditLog,
        ],
        synchronize: false,
        migrationsRun: true,
        migrations: [CreateInitialSchema1720000000000],
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    TerminusModule,
    AuthModule,
    AgentModule,
    DeviceModule,
    ReleaseModule,
    ArtifactModule,
    DeploymentModule,
    AuditModule,
    HealthModule,
  ],
})
export class AppModule {}