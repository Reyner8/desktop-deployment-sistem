import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '@rscb/shared';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ name: 'display_name', nullable: true })
  displayName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Role sederhana dua tingkat (keputusan 2026-10-24): ADMIN mengelola user
  // dan konfigurasi; OPERATOR menjalankan operasi harian (release,
  // deployment) tanpa hak administrasi.
  @Column({ type: 'enum', enum: UserRole, default: UserRole.OPERATOR })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}