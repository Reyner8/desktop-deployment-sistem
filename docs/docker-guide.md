# Docker Guide

Panduan lengkap menjalankan RSCB Deployment System dengan Docker.

## Development Stack

```bash
docker compose up -d --build
```

### Service Overview

| Service    | Container        | Port   | Healthcheck              |
|-----------|------------------|--------|--------------------------|
| postgres  | rscb-postgres    | 5432   | pg_isready               |
| minio     | rscb-minio       | 9000/9001 | /minio/health/live    |
| backend   | rscb-backend     | 3000   | depends_on service_healthy |
| web       | rscb-web         | 8080   | —                        |

### Credentials

| Service    | Username   | Password       | Database/Console |
|-----------|-----------|---------------|-----------------|
| PostgreSQL | postgres  | Tigerlake.85  | rscb_deployment |
| MinIO      | minioadmin | minioadmin    | rscb-artifacts  |
| Admin      | admin     | admin123      | Dashboard login |

### Akses

- **Dashboard**: http://localhost:8080
- **API**: http://localhost:3000/api/v1
- **MinIO Console**: http://localhost:9001
- **Health**: http://localhost:3000/health

## Volumes

| Volume        | Keterangan                  |
|--------------|-----------------------------|
| postgres-data | Data PostgreSQL persisten   |
| minio-data   | Object artifact persisten   |
| uploads      | Local upload (fallback)     |

### Reset Semua Data

```bash
docker compose down -v
docker compose up -d --build
```

Skema database dibuat ulang otomatis oleh TypeORM migrations.

## Production

### 1. Buat `.env` file

```bash
cp .env.example .env
```

Edit `.env` dengan production secrets:

```env
DB_USER=postgres
DB_PASSWORD=<strong-password>
JWT_SECRET=<strong-random-secret>
ADMIN_PASSWORD=<strong-password>
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<strong-password>
MINIO_PUBLIC_URL=https://minio.example.com
```

### 2. Jalankan

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Reverse Proxy (Nginx)

Gunakan nginx sebagai reverse proxy untuk production:

```nginx
server {
    listen 443 ssl;
    server_name deployment.example.com;

    ssl_certificate /etc/ssl/certs/deployment.pem;
    ssl_certificate_key /etc/ssl/private/deployment.key;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 500M;
    }
}
```

### 4. Backup

```bash
# Backup PostgreSQL
docker exec rscb-postgres pg_dump -U postgres rscb_deployment > backup.sql

# Backup MinIO
docker run --rm -v rscb-deployment_minio-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/minio-backup.tar.gz /data
```

## Troubleshooting

### Backend tidak start

```bash
docker compose logs backend
```

Kemungkinan: PostgreSQL belum siap atau MinIO belum healthy. Tunggu healthcheck passing.

### Skema tidak ada

```bash
docker exec rscb-postgres psql -U postgres -d rscb_deployment -c '\dt'
```

Jika kosong, cek log backend untuk migration errors. Reset volume:
```bash
docker compose down -v
docker compose up -d postgres
docker compose up -d backend
```

### MinIO bucket tidak ada

Backend membuat bucket otomatis saat startup. Cek log:
```bash
docker compose logs backend | grep bucket
```

### Port conflict

```bash
# Cek port yang digunakan
lsof -i :5432
lsof -i :9000
lsof -i :3000
lsof -i :8080
```

### Clean reinstall

```bash
docker compose down -v --remove-orphans
docker system prune -f
docker compose up -d --build
```
