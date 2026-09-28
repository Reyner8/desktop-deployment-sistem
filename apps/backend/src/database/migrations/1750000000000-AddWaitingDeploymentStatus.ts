import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWaitingDeploymentStatus1750000000000 implements MigrationInterface {
  name = 'AddWaitingDeploymentStatus1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."deployment_status_enum" ADD VALUE IF NOT EXISTS 'WAITING'`,
    );
  }

  public down(): Promise<void> {
    // PostgreSQL tidak mendukung penghapusan nilai enum secara langsung.
    return Promise.resolve();
  }
}
