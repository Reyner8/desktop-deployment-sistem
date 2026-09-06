import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUploadSessions1730000000000 implements MigrationInterface {
  name = 'AddUploadSessions1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."upload_session_status_enum" AS ENUM (
        'INITIATED', 'COMPLETING', 'COMPLETED', 'FAILED', 'ABORTED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "upload_sessions" (
        "id"          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "application" varchar NOT NULL,
        "version"     varchar NOT NULL,
        "file_name"   varchar NOT NULL,
        "mime_type"   varchar NOT NULL DEFAULT 'application/zip',
        "total_size"  bigint NOT NULL,
        "sha256"      varchar(64),
        "part_size"   integer NOT NULL,
        "object_key"  varchar NOT NULL,
        "parts"       jsonb NOT NULL DEFAULT '[]',
        "status"      upload_session_status_enum NOT NULL DEFAULT 'INITIATED',
        "release_id"  uuid NOT NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_upload_session_release"
          FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_upload_sessions_application_version"
        ON "upload_sessions" ("application", "version")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_upload_sessions_release_id"
        ON "upload_sessions" ("release_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_upload_sessions_status"
        ON "upload_sessions" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "upload_sessions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."upload_session_status_enum"`);
  }
}