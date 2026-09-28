# Database Schema

Skema database RSCB Deployment System. Diprovisiing otomatis via TypeORM migrations saat backend container start.

## Overview

```
users ─────────────────────┐
                           │
devices ───────────────┐   │
  └─ device_networks   │   │
                       │   │
releases ──────────────┤   │
  ├─ artifacts         │   │
  └─ upload_sessions   │   │
                       │   │
deployments ───────────┤   │
  └─ deployment_events │   │
                       │   │
audit_logs ────────────┘   │
                           │
(relationships via FK)     │
```

## Enums

### device_status

| Value            | Keterangan                       |
| ---------------- | -------------------------------- |
| ONLINE           | Agent terhubung                  |
| OFFLINE          | Agent tidak terlihat (> 5 menit) |
| UPDATE_AVAILABLE | Update tersedia, menunggu stop   |
| UPDATING         | Sedang melakukan update          |
| ERROR            | Error pada agent                 |

### release_status

| Value     | Keterangan                                     |
| --------- | ---------------------------------------------- |
| DRAFT     | Release dibuat, artifact belum diupload        |
| UPLOADING | Artifact sedang diupload                       |
| VERIFYING | SHA-256 sedang diverifikasi                    |
| PUBLISHED | Siap didistribusikan ke agent                  |
| FAILED    | Upload/verifikasi gagal                        |
| ARCHIVED  | Release diarsipkan, tidak didistribusikan lagi |

### deployment_status

| Value       | Keterangan                                   |
| ----------- | -------------------------------------------- |
| PENDING     | Deployment dibuat, menunggu agent ambil task |
| ASSIGNED    | Task diberikan ke agent                      |
| DOWNLOADING | Agent mengunduh artifact                     |
| VERIFYING   | Agent memverifikasi SHA-256                  |
| WAITING     | Artefak siap, tapi aplikasi masih berjalan   |
| INSTALLING  | Agent melakukan instalasi                    |
| STARTING    | Agent menjalankan kembali aplikasi           |
| SUCCESS     | Instalasi berhasil                           |
| FAILED      | Proses gagal                                 |
| CANCELLED   | Deployment dibatalkan oleh admin             |

Urutan nilai enum mengikuti alur lifecycle, dan Postgres mengurutkan kolom
enum berdasarkan posisi nilai. Karena itu `WAITING` disisipkan sebelum
`INSTALLING` lewat migration `ReorderWaitingDeploymentStatus`, bukan hanya
ditambahkan di akhir.

### upload_session_status

| Value      | Keterangan                                  |
| ---------- | ------------------------------------------- |
| INITIATED  | Sesi dibuka, menunggu part                  |
| COMPLETING | Semua part lengkap, proses compose + verify |
| COMPLETED  | Selesai, release menjadi PUBLISHED          |
| FAILED     | Compose/verifikasi gagal                    |
| ABORTED    | Sesi dibatalkan                             |

## Tabel

### users

| Kolom        | Tipe        | Constraint        | Keterangan            |
| ------------ | ----------- | ----------------- | --------------------- |
| id           | uuid        | PK, auto-generate | ID unik user          |
| username     | varchar     | UNIQUE, NOT NULL  | Username login        |
| password     | varchar     | NOT NULL          | Hash bcrypt           |
| display_name | varchar     | nullable          | Nama tampilan         |
| is_active    | boolean     | DEFAULT true      | Status aktif          |
| created_at   | timestamptz | DEFAULT now()     | Waktu pembuatan       |
| updated_at   | timestamptz | DEFAULT now()     | Waktu update terakhir |

### devices

| Kolom               | Tipe          | Constraint       | Keterangan            |
| ------------------- | ------------- | ---------------- | --------------------- |
| id                  | uuid          | PK               | ID unik device        |
| device_id           | varchar       | UNIQUE, NOT NULL | ID dari agent (UUID)  |
| hostname            | varchar       | NOT NULL         | Nama komputer         |
| os                  | varchar       | nullable         | Sistem operasi        |
| agent_version       | varchar       | NOT NULL         | Versi agent           |
| application_version | varchar       | nullable         | Versi SIMRS terpasang |
| status              | device_status | DEFAULT 'ONLINE' | Status device         |
| last_seen           | timestamptz   | DEFAULT now()    | Terakhir terlihat     |
| token               | varchar       | nullable         | Token autentikasi     |
| is_active           | boolean       | DEFAULT true     | Status aktif          |
| created_at          | timestamptz   | DEFAULT now()    | Waktu registrasi      |
| updated_at          | timestamptz   | DEFAULT now()    | Waktu update terakhir |

### device_networks

| Kolom      | Tipe    | Constraint               | Keterangan       |
| ---------- | ------- | ------------------------ | ---------------- |
| id         | uuid    | PK                       | ID unik          |
| device_id  | uuid    | FK → devices(id) CASCADE | Referensi device |
| ip_address | varchar | NOT NULL                 | Alamat IP        |

### releases

| Kolom         | Tipe           | Constraint      | Keterangan            |
| ------------- | -------------- | --------------- | --------------------- |
| id            | uuid           | PK              | ID unik release       |
| application   | varchar        | NOT NULL        | Nama aplikasi         |
| version       | varchar        | NOT NULL        | Versi semantik        |
| release_notes | text           | nullable        | Catatan rilis         |
| status        | release_status | DEFAULT 'DRAFT' | Status release        |
| created_at    | timestamptz    | DEFAULT now()   | Waktu pembuatan       |
| published_at  | timestamptz    | nullable        | Waktu publish         |
| updated_at    | timestamptz    | DEFAULT now()   | Waktu update terakhir |

### artifacts

| Kolom          | Tipe        | Constraint                         | Keterangan           |
| -------------- | ----------- | ---------------------------------- | -------------------- |
| id             | uuid        | PK                                 | ID unik artifact     |
| release_id     | uuid        | UNIQUE, FK → releases(id) SET NULL | Referensi release    |
| file_name      | varchar     | NOT NULL                           | Nama file asli       |
| object_key     | varchar     | NOT NULL                           | Path di MinIO/local  |
| size           | bigint      | NOT NULL                           | Ukuran byte          |
| sha256         | varchar(64) | NOT NULL                           | Checksum SHA-256     |
| mime_type      | varchar     | NOT NULL                           | Tipe konten          |
| storage_driver | varchar     | NOT NULL                           | 'minio' atau 'local' |
| created_at     | timestamptz | DEFAULT now()                      | Waktu upload         |

### upload_sessions

Sesi chunked upload dari CI/CD. Satu sesi terhubung ke satu release
(`ON DELETE CASCADE`).

| Kolom       | Tipe                  | Constraint                | Keterangan               |
| ----------- | --------------------- | ------------------------- | ------------------------ |
| id          | uuid                  | PK                        | ID unik sesi             |
| application | varchar               | NOT NULL                  | Nama aplikasi            |
| version     | varchar               | NOT NULL                  | Versi semantik           |
| file_name   | varchar               | NOT NULL                  | Nama file artifact       |
| mime_type   | varchar               | DEFAULT 'application/zip' | Tipe konten              |
| total_size  | bigint                | NOT NULL                  | Ukuran total byte        |
| sha256      | varchar(64)           | nullable                  | Checksum yang diharapkan |
| part_size   | integer               | NOT NULL                  | Ukuran part (byte)       |
| object_key  | varchar               | NOT NULL                  | Path object final        |
| parts       | jsonb                 | DEFAULT '[]'              | Daftar part terupload    |
| status      | upload_session_status | DEFAULT 'INITIATED'       | Status sesi              |
| release_id  | uuid                  | FK → releases(id) CASCADE | Referensi release        |
| created_at  | timestamptz           | DEFAULT now()             | Waktu dibuat             |
| updated_at  | timestamptz           | DEFAULT now()             | Waktu update terakhir    |

**Index**: (application, version), release_id, status

### deployments

| Kolom         | Tipe              | Constraint                 | Keterangan            |
| ------------- | ----------------- | -------------------------- | --------------------- |
| id            | uuid              | PK                         | ID unik deployment    |
| release_id    | uuid              | FK → releases(id) RESTRICT | Target release        |
| device_id     | uuid              | FK → devices(id) RESTRICT  | Target device         |
| status        | deployment_status | DEFAULT 'PENDING'          | Status deployment     |
| error_message | text              | nullable                   | Pesan error           |
| created_at    | timestamptz       | DEFAULT now()              | Waktu pembuatan       |
| updated_at    | timestamptz       | DEFAULT now()              | Waktu update terakhir |

**Index**: release_id, device_id, status

### deployment_events

| Kolom         | Tipe              | Constraint                   | Keterangan           |
| ------------- | ----------------- | ---------------------------- | -------------------- |
| id            | uuid              | PK                           | ID unik event        |
| deployment_id | uuid              | FK → deployments(id) CASCADE | Referensi deployment |
| status        | deployment_status | NOT NULL                     | Status saat event    |
| message       | text              | NOT NULL                     | Deskripsi event      |
| created_at    | timestamptz       | DEFAULT now()                | Waktu event          |

**Index**: deployment_id

### audit_logs

| Kolom      | Tipe        | Constraint    | Keterangan          |
| ---------- | ----------- | ------------- | ------------------- |
| id         | uuid        | PK            | ID unik log         |
| actor      | varchar     | NOT NULL      | Yang melakukan aksi |
| action     | varchar     | NOT NULL      | Jenis aksi          |
| target     | varchar     | NOT NULL      | Target aksi         |
| target_id  | varchar     | nullable      | ID target           |
| details    | jsonb       | nullable      | Detail tambahan     |
| result     | varchar     | NOT NULL      | 'SUCCESS'/'FAILURE' |
| created_at | timestamptz | DEFAULT now() | Waktu aksi          |

**Index**: actor, action, created_at

## Provisiing

Skema diprovisiing otomatis oleh backend saat container pertama kali start:

1. PostgreSQL diinisialisasi dengan `CREATE EXTENSION uuid-ossp` via `init.sql`
2. Backend menjalankan TypeORM migrations: `CreateInitialSchema1720000000000`,
   `AddUploadSessions1730000000000`, `AddArchivedReleaseStatus1740000000000`
3. Semua tabel + enum + index dibuat otomatis; total 9 tabel + 4 enum

### Reset Database

```bash
# Hapus volume PostgreSQL
docker compose down -v

# Restart (skema dibuat ulang otomatis)
docker compose up -d postgres
docker compose up -d backend
```

### Generate Migration Baru

```bash
# Dari perubahan entity
npm run migration:generate -w apps/backend -- src/database/migrations/NamaMigration

# Run manual
npm run migration:run -w apps/backend

# Revert
npm run migration:revert -w apps/backend
```
