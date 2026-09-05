import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  actor: string;

  @Column()
  action: string;

  @Column()
  target: string;

  @Column({ name: 'target_id', nullable: true })
  targetId: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @Column()
  result: string;

  @CreateDateColumn({ name: 'created_at' })
  timestamp: Date;
}