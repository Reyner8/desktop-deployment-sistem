# RSCB Deployment System

Sistem deployment terpusat untuk mendistribusikan aplikasi SIMRS ke komputer unit.

## Arsitektur

- **Backend**: NestJS (monolith modular)
- **Frontend**: ReactJS + TypeScript
- **Database**: PostgreSQL
- **Object Storage**: MinIO
- **Agent**: Java 21 (repository terpisah)

## Struktur Repository

```
rscb-deployment/
├── apps/
│   ├── backend/     # NestJS monolith backend
│   └── web/         # ReactJS frontend dashboard
├── packages/
│   └── shared/      # Shared types dan utilities
├── infra/
│   ├── docker/      # Dockerfiles
│   ├── nginx/       # Nginx configuration
│   └── postgres/    # Database init scripts
├── docker-compose.yml
└── docker-compose.prod.yml
```

## Prasyarat

- Node.js >= 18
- Docker & Docker Compose (untuk development dengan infrastruktur lengkap)
- PostgreSQL (jika running tanpa Docker)
- MinIO (jika running tanpa Docker)

## Development

### Dengan Docker

```bash
docker compose up -d
```

### Tanpa Docker

```bash
# Install dependencies
npm install

# Setup environment
cp apps/backend/.env.example apps/backend/.env
# Edit .env sesuai konfigurasi lokal

# Build shared package
npm run build -w packages/shared

# Run backend
npm run dev:backend

# Run frontend (terminal terpisah)
npm run dev:web
```

## API Documentation

Endpoint utama:

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
| GET | `/health` | Health check |

## Deployment Lifecycle

### Release State Machine

```
DRAFT → UPLOADED → PUBLISHED
```

- **DRAFT**: Release dibuat, artifact belum diupload.
- **UPLOADED**: Artifact sudah diupload, SHA-256 sudah diverifikasi.
- **PUBLISHED**: Release siap didistribusikan ke agent. Release yang sudah PUBLISHED tidak dapat diubah.

### Deployment State Machine

```
PENDING → DOWNLOADING → DOWNLOADED → INSTALLING → SUCCESS
                                      ↓
                                    FAILED
```

- **PENDING**: Deployment dibuat, menunggu agent mengambil task.
- **DOWNLOADING**: Agent sedang mengunduh artifact.
- **DOWNLOADED**: Artifact berhasil diunduh dan SHA-256 cocok.
- **INSTALLING**: Agent sedang melakukan instalasi.
- **SUCCESS**: Instalasi berhasil.
- **FAILED**: Instalasi gagal (download corrupt, verifikasi gagal, aplikasi sedang berjalan, error instalasi).

## Catatan Keamanan

- Jangan commit `.env` ke repository
- Agent tidak memiliki akses ke database atau MinIO credential
- Gunakan HTTPS di production
- Ganti semua default secret sebelum production
- Production credentials hanya boleh diketahui oleh admin server

## Lisensi

MIT