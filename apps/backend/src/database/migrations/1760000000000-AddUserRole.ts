import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRole1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('ADMIN', 'OPERATOR')`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "role" "users_role_enum" NOT NULL DEFAULT 'OPERATOR'`,
    );
    // Bootstrap: user pertama (dibuat seedAdmin) menjadi ADMIN. Deployment
    // lama dengan beberapa user tetap punya satu ADMIN yang jelas.
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'ADMIN'
       WHERE "id" = (SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
