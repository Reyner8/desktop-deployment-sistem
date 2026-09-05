import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Release } from '../../releases/entities/release.entity';

@Entity('artifacts')
export class Artifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Release, (release) => release.artifact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'release_id' })
  release: Release;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'object_key' })
  objectKey: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ length: 64 })
  sha256: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'storage_driver' })
  storageDriver: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}