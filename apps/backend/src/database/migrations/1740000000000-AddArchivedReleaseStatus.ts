import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchivedReleaseStatus1740000000000 implements MigrationInterface {
  name = 'AddArchivedReleaseStatus1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."release_status_enum" ADD VALUE IF NOT EXISTS 'ARCHIVED'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL tidak mendukung penghapusan nilai enum secara langsung.
  }
}
