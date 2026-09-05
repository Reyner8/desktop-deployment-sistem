import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { DeploymentStatus } from '@rscb/shared';
import { Release } from '../../releases/entities/release.entity';
import { Device } from '../../devices/entities/device.entity';
import { DeploymentEvent } from './deployment-event.entity';

@Entity('deployments')
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Release, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'release_id' })
  release: Release;

  @ManyToOne(() => Device, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({
    type: 'enum',
    enum: DeploymentStatus,
    default: DeploymentStatus.PENDING,
  })
  status: DeploymentStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => DeploymentEvent, (event) => event.deployment, { cascade: true })
  events: DeploymentEvent[];
}