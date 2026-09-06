# RSCB Deployment System

Sistem deployment terpusat untuk mendistribusikan aplikasi SIMRS ke komputer unit.

## Arsitektur

- **Backend**: NestJS (monolith modular)
- **Frontend**: ReactJS + TypeScript
- **Database**: PostgreSQL 16 (Docker)
- **Object Storage**: MinIO (Docker)
- **Agent**: Java 21 (repository terpisah)

## Struktur Repository

```
rscb-deployment/
├── apps/
│   ├── backend/        # NestJS monolith backend
│   │   └── src/
│   │       ├── database/migrations/  # TypeORM migrations
│   │       ├── artifacts/storage/    # MinIO + Local storage adapter
│   │       └── ...
│   └── web/            # ReactJS frontend dashboard
├── packages/
│   └── shared/         # Shared types, enums, constants
├── infra/
│   ├── docker/         # Dockerfiles
│   ├── nginx/          # Nginx configuration
│   └── postgres/       # Database init scripts
├── docs/               # Dokumentasi teknis
├── docker-compose.yml          # Development
└── docker-compose.prod.yml     # Production
```

## Prasyarat

- Node.js >= 18
- Docker & Docker Compose

## Development

### 1. Jalankan seluruh stack (Docker)

```bash
docker compose up -d --build
```

Ini akan menjalankan:

| Service  | URL                          | Keterangan            |
|----------|------------------------------|-----------------------|
| Web      | http://localhost:8080        | Dashboard admin       |
| Backend  | http://localhost:3000        | REST API              |
| PostgreSQL | localhost:5432             | Database              |
| MinIO    | http://localhost:9001        | Console (minioadmin)  |
| MinIO API | http://localhost:9000       | S3-compatible API     |

### 2. Login ke dashboard

- URL: `http://localhost:8080`
- Username: `admin`
- Password: `admin123`

### 3. Jalankan tanpa Docker (lokal)

```bash
npm install

# Build shared package
npm run build -w packages/shared

# Jalankan backend (butuh PostgreSQL & MinIO lokal)
cp apps/backend/.env.example apps/backend/.env
# Edit .env sesuai konfigurasi lokal
npm run dev:backend

# Jalankan frontend (terminal terpisah)
npm run dev:web
```

## Skema Database

Skema database diprovisiing otomatis via **TypeORM migrations** saat backend container pertama kali start.

- Migration file: `apps/backend/src/database/migrations/`
- `synchronize: false` — tidak ada auto-sync dari entity
- `migrationsRun: true` — migrasi jalan otomatis saat startup

Lihat [docs/database-schema.md](docs/database-schema.md) untuk detail skema.

## Artifact Storage

Artifact disimpan di **MinIO** (production) atau **local filesystem** (fallback).

- Driver dikonfigurasi via `STORAGE_DRIVER` (`minio` | `local`)
- MinIO: presigned URL untuk download agent
- SHA-256 dihitung server-side saat upload
- Bucket `rscb-artifacts` dibuat otomatis saat startup

Lihat [docs/docker-guide.md](docs/docker-guide.md) untuk konfigurasi storage.

## CI/CD

Backend menyediakan endpoint `/api/v1/ci/*` untuk pipeline GitHub Action
dengan **chunked upload** yang mendukung file ratusan MB/GB — backend
menjadi satu-satunya pihak yang menyentuh MinIO.

```bash
# Contoh curl cepat (coba manual)
curl -X POST -H "x-api-key: dev-ci-key-change-in-production" \
  -F "application=SIMRS" -F "version=9.9.0" -F "fileName=test.zip" \
  -F "totalSize=1048576" -F "sha256=$(sha256sum test.zip | cut -d' ' -f1)" \
  http://localhost:3000/api/v1/ci/uploads
```

Lihat [docs/ci-cd.md](docs/ci-cd.md) untuk panduan lengkap + template
GitHub Actions workflow.

## API Documentation

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/v1/auth/login` | Login admin |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/agents/register` | Register agent |
| POST | `/api/v1/agents/heartbeat` | Agent heartbeat |
| GET | `/api/v1/agents/updates` | Check updates |
| GET | `/api/v1/devices` | List devices |
| GET | `/api/v1/devices/:id` | Device detail |
| POST | `/api/v1/releases` | Create release |
| GET | `/api/v1/releases` | List releases |
| POST | `/api/v1/releases/:id/artifact` | Upload artifact |
| POST | `/api/v1/releases/:id/publish` | Publish release |
| POST | `/api/v1/deployments` | Create deployment |
| GET | `/api/v1/deployments` | List deployments |
| GET | `/api/v1/deployments/:id` | Deployment detail |
| GET | `/api/v1/audit` | Audit logs |
| **POST** | **`/api/v1/ci/uploads`** | **Buka sesi chunked upload** |
| **POST** | **`/api/v1/ci/uploads/:id/parts/:n`** | **Upload chunk (≤ 16MB)** |
| **GET** | **`/api/v1/ci/uploads/:id`** | **Status sesi (resume)** |
| **POST** | **`/api/v1/ci/uploads/:id/complete`** | **Finalisasi → PUBLISHED** |
| **DELETE** | **`/api/v1/ci/uploads/:id`** | **Batalkan sesi** |
| **GET** | **`/api/v1/ci/releases?application=&version=`** | **Cek duplikat** |
| GET | `/health` | Health check |

## Deployment Lifecycle

### Release State Machine

```
DRAFT → UPLOADING → VERIFYING → PUBLISHED
                     ↑
      (CI chunked: upload langsung ke VERIFYING)
                     ↓
                   FAILED
```

### Deployment State Machine

```
PENDING → ASSIGNED → DOWNLOADING → VERIFYING → INSTALLING → STARTING → SUCCESS
                       ↓              ↓           ↓
                     FAILED          FAILED      FAILED
                       ↓
                     CANCELLED
```

## Development Commands

```bash
# Build semua
npm run build

# Jalankan backend dev (watch mode)
npm run dev:backend

# Jalankan frontend dev
npm run dev:web

# Generate migration
npm run migration:generate -w apps/backend

# Run migrations manual
npm run migration:run -w apps/backend

# Docker full rebuild
docker compose down -v && docker compose up -d --build
```

## Catatan Keamanan

- Jangan commit `.env` ke repository
- Ganti semua default secret sebelum production
- Agent tidak memiliki akses ke database atau MinIO credential
- Gunakan HTTPS di production

## Lisensi

Apache License 2.0
