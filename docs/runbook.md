# Runbook Operasional — RSCB Deployment Server

Panduan untuk mengoperasikan stack deployment server di produksi:
backup/restore, upgrade, troubleshooting, dan monitoring dasar.

Referensi terkait: [`docker-guide.md`](docker-guide.md) untuk menjalankan
stack, [`ci-cd.md`](ci-cd.md) untuk alur publish SIMRS dari CI.

## 1. Backup

Script: [`infra/backup/backup.sh`](../infra/backup/backup.sh). Yang
dibackup: database PostgreSQL (`pg_dump -Fc`) dan seluruh isi bucket
MinIO (mirror). Retensi default 14 hari.

Setup sekali:

```bash
sudo mkdir -p /var/backups/rscb
# isi dari .env produksi (jangan di-commit):
export MINIO_USER=... MINIO_PASSWORD=...
# cron 02:00 setiap hari:
0 2 * * * /opt/rscb/infra/backup/backup.sh /var/backups/rscb >> /var/log/rscb-backup.log 2>&1
```

Verifikasi rutin (sarankan mingguan): cek log cron ada baris "selesai",
daftar `/var/backups/rscb/db/` berisi dump harian, dan **uji restore**
sesekali ke environment lain — backup yang belum pernah direstore belum
bisa disebut backup.

## 2. Restore

Script: [`infra/backup/restore.sh`](../infra/backup/restore.sh). Hanya
dijalankan di jendela maintenance karena menimpa data yang ada:

```bash
docker compose -f docker-compose.prod.yml stop backend
./restore.sh db    /var/backups/rscb/db/rscb_deployment-20261024-020000.dump
./restore.sh minio /var/backups/rscb/minio
docker compose -f docker-compose.prod.yml start backend
```

Migrasi TypeORM berjalan otomatis saat backend start (`migrationsRun`).

## 3. Upgrade stack

```bash
git -C /opt/rscb fetch --tags && git -C /opt/rscb checkout vX.Y.Z
docker compose -f docker-compose.prod.yml pull   # bila memakai image GHCR
docker compose -f docker-compose.prod.yml up -d --build
```

Rollback: `checkout` tag sebelumnya lalu `up -d` lagi. Bila rollback
melintasi migration yang menambah enum/tabel, database perlu
direstore dari backup (migration `down` beberapa perubahan enum
sengaja no-op — lihat `docs/database-schema.md`).

Image produksi tersedia di GHCR:
`ghcr.io/reyner8/rscb-deployment-backend` dan
`ghcr.io/reyner8/rscb-deployment-web` (tag `main-<sha>` rolling,
tag semver untuk release).

## 4. HTTPS (produksi)

Terminasi TLS terjadi di container web (nginx). Lihat
[`infra/nginx/default.prod.conf`](../infra/nginx/default.prod.conf) dan
bagian HTTPS di [`docker-guide.md`](docker-guide.md). Pastikan:

- sertifikat di-mount via volume `./infra/certs`;
- `client_max_body_size` ≥ ukuran part CI (default 16 MiB — sudah disetel);
- redirect port 80 → 443 aktif.

## 5. Monitoring dasar

- **Health**: `GET /api/v1/health` mengecek DB (503 saat DB mati);
  `GET /api/v1/health/ready` setara. Kedua container punya healthcheck
  compose — `docker ps` menampilkan (healthy/unhealthy).
- **Watchdog sederhana** (cron tiap 5 menit):

  ```bash
  curl -fsS http://localhost:3000/api/v1/health || systemctl restart docker  # atau alert
  ```

- **Log**: `docker compose logs -f backend` (NestJS + audit log). Log
  nginx di container web. Untuk jangka panjang, pasak log rotation di
  host (`logrotate` pada JSON file driver docker).

## 6. Troubleshooting umum

| Gejala | Sebab umum | Tindakan |
| --- | --- | --- |
| Backend restart terus, log `password authentication failed` | Password DB tidak cocok dengan volume lama | Samakan `DB_PASSWORD` dengan password volume, atau buat volume baru (data hilang — restore backup) |
| CI upload 401 | `CI_API_KEY` tidak sama dengan secret `DEPLOYMENT_CI_KEY` | Samakan; header harus `x-api-key` |
| CI upload 413 | Part melebihi `client_max_body_size` nginx | Set ≥ partSize (default 16 MiB, aman: 20M) |
| CI 409 `Missing parts` | Run CI terputus | Rerun workflow — script hanya meng-upload `missingParts` |
| Agent 401 terus | Token device dirotasi | Agent melakukan re-register otomatis; bila tetap gagal cek device `isActive` |
| Deployment stuck non-terminal | Agent mati di tengah alur | Agent akan melanjutkan sendiri saat polling berikutnya; cek `docker logs` device terkait |
| Dashboard `Server Offline` | Backend mati / DB mati | `docker compose ps`, cek `GET /api/v1/health`, cek log backend |

## 7. Keamanan operasional (checklist)

- [ ] Semua secret di `.env` produksi unik dan bukan nilai contoh.
- [ ] Password admin diganti via Settings → Change Password setelah setup.
- [ ] Backup berjalan otomatis dan pernah diuji restore-nya.
- [ ] Sertifikat TLS valid dan di-renew (cron certbot bila Let's Encrypt).
- [ ] Image di-pin ke tag semver (bukan `latest`) di compose produksi.
