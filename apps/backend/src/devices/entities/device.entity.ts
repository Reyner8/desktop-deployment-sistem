import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DeviceNetwork } from './device-network.entity';
import { DeviceStatus } from '@rscb/shared';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', unique: true })
  deviceId: string;

  @Column()
  hostname: string;

  @Column({ nullable: true })
  os: string;

  @Column({ name: 'agent_version' })
  agentVersion: string;

  @Column({ name: 'application_version', nullable: true })
  applicationVersion: string;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.ONLINE,
  })
  status: DeviceStatus;

  @Column({ name: 'last_seen', type: 'timestamptz', default: () => 'NOW()' })
  lastSeen: Date;

  @Column({ nullable: true })
  token: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => DeviceNetwork, (network) => network.device, { cascade: true })
  networks: DeviceNetwork[];
}