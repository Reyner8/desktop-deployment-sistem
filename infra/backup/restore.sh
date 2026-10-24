#!/usr/bin/env bash
#
# restore.sh — pulihkan PostgreSQL dan/atau artifact MinIO dari hasil backup.sh.
#
# Pemakaian:
#   ./restore.sh db      /path/ke/db/rscb_deployment-<stamp>.dump
#   ./restore.sh minio   /path/ke/folder-minio
#
# Environment sama dengan backup.sh. Perhatian: restore menimpa data yang
# ada — pastikan stack berhenti atau sedang dalam jendela maintenance.
set -euo pipefail

KIND="${1:?pemakaian: restore.sh <db|minio> <target>}"
TARGET="${2:?path backup wajib diisi}"

DB_CONTAINER="${DB_CONTAINER:-rscb-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-rscb_deployment}"
MINIO_NETWORK="${MINIO_NETWORK:-desktop-deployment-system_default}"
MINIO_BUCKET="${MINIO_BUCKET:-rscb-artifacts}"

: "${MINIO_USER:?MINIO_USER wajib diisi}"
: "${MINIO_PASSWORD:?MINIO_PASSWORD wajib diisi}"

case "$KIND" in
  db)
    [ -f "$TARGET" ] || { echo "dump tidak ditemukan: $TARGET" >&2; exit 1; }
    echo "[restore] pg_restore dari $TARGET (menimpa database ${DB_NAME})"
    docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists < "$TARGET"
    echo "[restore] database selesai"
    ;;
  minio)
    [ -d "$TARGET" ] || { echo "folder backup tidak ditemukan: $TARGET" >&2; exit 1; }
    echo "[restore] mirror ${TARGET} -> bucket ${MINIO_BUCKET} (overwrite)"
    docker run --rm --network "$MINIO_NETWORK" \
      -v "${TARGET}:/backup:ro" \
      minio/mc sh -c "
        mc alias set srv http://minio:9000 '${MINIO_USER}' '${MINIO_PASSWORD}' >/dev/null &&
        mc mirror --overwrite /backup/ srv/${MINIO_BUCKET} >/dev/null
      "
    echo "[restore] artifact selesai"
    ;;
  *)
    echo "kind tidak dikenal: $KIND (gunakan db atau minio)" >&2
    exit 1
    ;;
esac
