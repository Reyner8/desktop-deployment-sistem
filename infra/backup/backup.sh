#!/usr/bin/env bash
#
# backup.sh — backup PostgreSQL (pg_dump) dan artifact MinIO ke folder backup.
#
# Pemakaian:
#   ./backup.sh /path/ke/folder-backup
#
# Environment (default mengikuti docker-compose.prod.yml):
#   DB_CONTAINER   nama container postgres   (default rscb-postgres)
#   DB_USER        user postgres             (default postgres)
#   DB_NAME        nama database             (default rscb_deployment)
#   MINIO_NETWORK  network compose           (default desktop-deployment-system_default)
#   MINIO_BUCKET   bucket artifact           (default rscb-artifacts)
#   MINIO_USER     MINIO_ROOT_USER           (wajib)
#   MINIO_PASSWORD MINIO_ROOT_PASSWORD       (wajib)
#   RETENTION_DAYS umur maksimum file backup (default 14)
#
# Cron contoh (02:00 setiap hari):
#   0 2 * * * /opt/rscb/infra/backup/backup.sh /var/backups/rscb >> /var/log/rscb-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${1:?pemakaian: backup.sh <folder-backup>}"
DB_CONTAINER="${DB_CONTAINER:-rscb-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-rscb_deployment}"
MINIO_NETWORK="${MINIO_NETWORK:-desktop-deployment-system_default}"
MINIO_BUCKET="${MINIO_BUCKET:-rscb-artifacts}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

: "${MINIO_USER:?MINIO_USER wajib diisi}"
: "${MINIO_PASSWORD:?MINIO_PASSWORD wajib diisi}"

STAMP=$(date +%Y%m%d-%H%M%S)
DB_DIR="${BACKUP_DIR}/db"
MINIO_DIR="${BACKUP_DIR}/minio"
mkdir -p "$DB_DIR" "$MINIO_DIR"

echo "[backup] dump PostgreSQL -> ${DB_DIR}/${DB_NAME}-${STAMP}.dump"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" \
  > "${DB_DIR}/${DB_NAME}-${STAMP}.dump"

echo "[backup] mirror bucket ${MINIO_BUCKET} -> ${MINIO_DIR}/"
docker run --rm --network "$MINIO_NETWORK" \
  -v "${MINIO_DIR}:/backup" \
  minio/mc sh -c "
    mc alias set srv http://minio:9000 '${MINIO_USER}' '${MINIO_PASSWORD}' >/dev/null &&
    mc mirror --overwrite srv/${MINIO_BUCKET} /backup/ >/dev/null &&
    mc ls --recursive srv/${MINIO_BUCKET} | wc -l
  " | xargs -I{} echo "[backup] {} objek tersalin"

echo "[backup] hapus backup lebih tua dari ${RETENTION_DAYS} hari"
find "$BACKUP_DIR" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] selesai"
