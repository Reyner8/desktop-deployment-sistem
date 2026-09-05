import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1720000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      CREATE TYPE "public"."device_status_enum" AS ENUM (
        'ONLINE', 'OFFLINE', 'UPDATE_AVAILABLE', 'UPDATING', 'ERROR'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."release_status_enum" AS ENUM (
        'DRAFT', 'UPLOADING', 'VERIFYING', 'PUBLISHED', 'FAILED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."deployment_status_enum" AS ENUM (
        'PENDING', 'ASSIGNED', 'DOWNLOADING', 'VERIFYING', 'INSTALLING',
        'STARTING', 'SUCCESS', 'FAILED', 'CANCELLED'
      )
    `);

    // UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "username"      varchar NOT NULL UNIQUE,
        "password"      varchar NOT NULL,
        "display_name"  varchar,
        "is_active"     boolean NOT NULL DEFAULT true,
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        "updated_at"    timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Devices
    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id"                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "device_id"           varchar NOT NULL UNIQUE,
        "hostname"            varchar NOT NULL,
        "os"                  varchar,
        "agent_version"       varchar NOT NULL,
        "application_version" varchar,
        "status"              device_status_enum NOT NULL DEFAULT 'ONLINE',
        "last_seen"           timestamptz NOT NULL DEFAULT now(),
        "token"               varchar,
        "is_active"           boolean NOT NULL DEFAULT true,
        "created_at"          timestamptz NOT NULL DEFAULT now(),
        "updated_at"          timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Device networks
    await queryRunner.query(`
      CREATE TABLE "device_networks" (
        "id"         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "device_id"  uuid NOT NULL,
        "ip_address" varchar NOT NULL,
        CONSTRAINT "fk_device_network_device"
          FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_device_networks_device_id"
        ON "device_networks" ("device_id")
    `);

    // Releases
    await queryRunner.query(`
      CREATE TABLE "releases" (
        "id"            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "application"   varchar NOT NULL,
        "version"       varchar NOT NULL,
        "release_notes" text,
        "status"        release_status_enum NOT NULL DEFAULT 'DRAFT',
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        "published_at"  timestamptz,
        "updated_at"    timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Artifacts
    await queryRunner.query(`
      CREATE TABLE "artifacts" (
        "id"              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "release_id"      uuid UNIQUE,
        "file_name"       varchar NOT NULL,
        "object_key"      varchar NOT NULL,
        "size"            bigint NOT NULL,
        "sha256"          varchar(64) NOT NULL,
        "mime_type"       varchar NOT NULL,
        "storage_driver"  varchar NOT NULL,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_artifact_release"
          FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL
      )
    `);

    // Deployments
    await queryRunner.query(`
      CREATE TABLE "deployments" (
        "id"           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "release_id"   uuid NOT NULL,
        "device_id"    uuid NOT NULL,
        "status"       deployment_status_enum NOT NULL DEFAULT 'PENDING',
        "error_message" text,
        "created_at"   timestamptz NOT NULL DEFAULT now(),
        "updated_at"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_deployment_release"
          FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_deployment_device"
          FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_deployments_release_id"
        ON "deployments" ("release_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_deployments_device_id"
        ON "deployments" ("device_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_deployments_status"
        ON "deployments" ("status")
    `);

    // Deployment events
    await queryRunner.query(`
      CREATE TABLE "deployment_events" (
        "id"            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "deployment_id" uuid NOT NULL,
        "status"        deployment_status_enum NOT NULL,
        "message"       text NOT NULL,
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_deployment_event_deployment"
          FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_deployment_events_deployment_id"
        ON "deployment_events" ("deployment_id")
    `);

    // Audit logs
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actor"       varchar NOT NULL,
        "action"      varchar NOT NULL,
        "target"      varchar NOT NULL,
        "target_id"   varchar,
        "details"     jsonb,
        "result"      varchar NOT NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_actor"
        ON "audit_logs" ("actor")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_action"
        ON "audit_logs" ("action")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_created_at"
        ON "audit_logs" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deployment_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deployments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "artifacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "releases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "device_networks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."deployment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."release_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."device_status_enum"`);
  }
}
