import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { ReleaseStatus } from '@rscb/shared';
import { Artifact } from '../../artifacts/entities/artifact.entity';

@Entity('releases')
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  application: string;

  @Column()
  version: string;

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes: string;

  @Column({
    type: 'enum',
    enum: ReleaseStatus,
    default: ReleaseStatus.DRAFT,
  })
  status: ReleaseStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Artifact, (artifact) => artifact.release, { nullable: true })
  artifact: Artifact;
}