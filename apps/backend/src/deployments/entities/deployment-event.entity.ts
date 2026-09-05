import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { DeploymentStatus } from '@rscb/shared';
import { Deployment } from './deployment.entity';

@Entity('deployment_events')
export class DeploymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Deployment, (deployment) => deployment.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deployment_id' })
  deployment: Deployment;

  @Column({
    type: 'enum',
    enum: DeploymentStatus,
  })
  status: DeploymentStatus;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  timestamp: Date;
}