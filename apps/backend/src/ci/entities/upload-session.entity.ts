import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Release } from '../../releases/entities/release.entity';

export enum UploadSessionStatus {
  INITIATED = 'INITIATED',
  COMPLETING = 'COMPLETING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ABORTED = 'ABORTED',
}

export type UploadedPart = {
  part: number;
  size: number;
};

@Entity('upload_sessions')
export class UploadSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  application: string;

  @Column()
  version: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'mime_type', default: 'application/zip' })
  mimeType: string;

  @Column({ type: 'bigint', name: 'total_size' })
  totalSize: number;

  @Column({ length: 64, nullable: true })
  sha256: string;

  @Column({ name: 'part_size', type: 'int' })
  partSize: number;

  @Column({ name: 'object_key' })
  objectKey: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  parts: UploadedPart[];

  @Column({
    type: 'enum',
    enum: UploadSessionStatus,
    default: UploadSessionStatus.INITIATED,
  })
  status: UploadSessionStatus;

  @ManyToOne(() => Release, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'release_id' })
  release: Release;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}