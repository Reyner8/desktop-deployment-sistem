import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration ini menata ulang urutan nilai deployment_status_enum.
 *
 * Migration 1750000000000 menambahkan WAITING dengan ALTER TYPE ... ADD VALUE,
 * sehingga nilainya ter-append di posisi terakhir. Padahal urutan nilai
 * enum yang ada memang disusun mengikuti alur lifecycle deployment, dan
 * Postgres mengurutkan kolom bertipe enum berdasarkan posisi nilai, bukan
 * abjad. Akibatnya sorting deployments berdasarkan status akan menaruh
 * WAITING paling bawah, setelah SUCCESS, FAILED, dan CANCELLED.
 *
 * PostgreSQL tidak menyediakan cara memindahkan nilai enum, jadi tipenya
 * dibuat ulang lalu kedua kolom dipindahkan ke tipe baru.
 */
export class ReorderWaitingDeploymentStatus1751000000000 implements MigrationInterface {
  name = 'ReorderWaitingDeploymentStatus1751000000000';

  private readonly lifecycleOrder = [
    'PENDING',
    'ASSIGNED',
    'DOWNLOADING',
    'VERIFYING',
    'WAITING',
    'INSTALLING',
    'STARTING',
    'SUCCESS',
    'FAILED',
    'CANCELLED',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const newType = 'deployment_status_enum_reorder';
    const values = this.lifecycleOrder.map((v) => `'${v}'`).join(', ');

    await queryRunner.query(
      `CREATE TYPE "public"."${newType}" AS ENUM (${values})`,
    );

    // Kolom deployments.status punya default, harus dilepas sebelum tipe
    // diubah dan dipasang lagi sesudahnya.
    await queryRunner.query(
      `ALTER TABLE "deployments" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" ALTER COLUMN "status" TYPE "public"."${newType}" USING "status"::text::"public"."${newType}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );

    await queryRunner.query(
      `ALTER TABLE "deployment_events" ALTER COLUMN "status" TYPE "public"."${newType}" USING "status"::text::"public"."${newType}"`,
    );

    await queryRunner.query(`DROP TYPE "public"."deployment_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."${newType}" RENAME TO "deployment_status_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Mengembalikan urutan lama tidak bisa dilakukan tanpa kehilangan posisi
    // WAITING, dan enum tidak mendukung pemindahan nilai. Karena itu migration
    // ini tidak dibalik; recovery dilakukan dengan restore backup database.
    await queryRunner.query(`SELECT 1`);
  }
}
