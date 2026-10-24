#!/usr/bin/env bash
#
# ci-publish.sh — publish artifact SIMRS ke Deployment Server via chunked upload.
#
# Pemakaian:
#   ./ci-publish.sh <file.zip> <application> <version>
#
# Environment:
#   DEPLOYMENT_URL   base URL backend (wajib), contoh https://deploy.rscb.example.com
#   DEPLOYMENT_CI_KEY API key CI (wajib), harus sama dengan CI_API_KEY backend
#   CI_PART_SIZE     override ukuran part (opsional; server yang menentukan)
#
# Perilaku:
#   - idempoten: release dengan (application, version) yang sudah PUBLISHED
#     membuat script selesai sukses tanpa upload ulang;
#   - resumable: sesi INITIATED dari run yang terputus dilanjutkan — hanya
#     part yang hilang (missingParts) yang di-upload;
#   - sesi FAILED/COMPLETING lama dibersihkan server secara otomatis saat
#     start sesi baru, jadi rerun berikutnya cukup jalan lagi.
#
# Dependensi: curl, jq, dd, stat, sha256sum.
set -euo pipefail

FILE="${1:?pemakaian: ci-publish.sh <file.zip> <application> <version>}"
APPLICATION="${2:?application wajib diisi}"
VERSION="${3:?version wajib diisi}"

: "${DEPLOYMENT_URL:?DEPLOYMENT_URL wajib diisi}"
: "${DEPLOYMENT_CI_KEY:?DEPLOYMENT_CI_KEY wajib diisi}"

API="${DEPLOYMENT_URL%/}/api/v1/ci"
log() { echo "[ci-publish] $*"; }
die() { echo "[ci-publish] ERROR: $*" >&2; exit 1; }

[ -f "$FILE" ] || die "file tidak ditemukan: $FILE"
command -v jq >/dev/null || die "jq tidak terpasang"

# ---------------------------------------------------------------- dedup cek
# Endpoint mengembalikan 404 bila release belum ada — itu kondisi normal.
if curl -fsS -H "x-api-key: ${DEPLOYMENT_CI_KEY}" \
    "${API}/releases?application=${APPLICATION}&version=${VERSION}&status=PUBLISHED" 2>/dev/null \
    | jq -e '.data != null' >/dev/null 2>&1; then
  log "release ${APPLICATION} ${VERSION} sudah PUBLISHED — lewati upload (idempoten)."
  exit 0
fi

# ---------------------------------------------------------------- mulai sesi
FILE_SIZE=$(stat -c%s "$FILE")
SHA256=$(sha256sum "$FILE" | cut -d' ' -f1)
FILE_NAME=$(basename "$FILE")
log "start sesi: ${APPLICATION} ${VERSION} (${FILE_SIZE} byte, sha256 ${SHA256:0:12}...)"

SESSION=$(curl -fsS -X POST \
  -H "x-api-key: ${DEPLOYMENT_CI_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
        \"application\": \"${APPLICATION}\",
        \"version\": \"${VERSION}\",
        \"fileName\": \"${FILE_NAME}\",
        \"mimeType\": \"application/zip\",
        \"totalSize\": ${FILE_SIZE},
        \"sha256\": \"${SHA256}\"
      }" \
  "${API}/uploads") || die "gagal membuka sesi upload"

UPLOAD_ID=$(echo "$SESSION" | jq -r '.data.uploadId')
PART_SIZE=$(echo "$SESSION" | jq -r '.data.partSize')
TOTAL_PARTS=$(echo "$SESSION" | jq -r '.data.totalParts')
log "sesi ${UPLOAD_ID}: partSize ${PART_SIZE}, total ${TOTAL_PARTS} part"

# ---------------------------------------------------------------- upload part
upload_part() {
  local PART_NUM=$1
  local SKIP=$(( (PART_NUM - 1) * PART_SIZE ))
  local REMAINING=$(( FILE_SIZE - SKIP ))
  [ "$REMAINING" -gt "$PART_SIZE" ] && REMAINING=$PART_SIZE
  local PART_FILE="part_${PART_NUM}.tmp"

  # dd dengan iflag=skip_bytes,count_bytes: part terakhir boleh lebih kecil
  # dari partSize dan tetap berhenti normal di EOF.
  dd if="$FILE" of="$PART_FILE" bs="$PART_SIZE" skip="$SKIP" count="$REMAINING" \
    iflag=skip_bytes,count_bytes 2>/dev/null || true
  local ACTUAL
  ACTUAL=$(stat -c%s "$PART_FILE" 2>/dev/null || echo 0)
  [ "$ACTUAL" -eq "$REMAINING" ] || die "part ${PART_NUM}: ${ACTUAL} byte, harusnya ${REMAINING}"

  for ATTEMPT in 1 2 3; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "x-api-key: ${DEPLOYMENT_CI_KEY}" \
      -F "file=@${PART_FILE}" \
      "${API}/uploads/${UPLOAD_ID}/parts/${PART_NUM}")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
      log "part ${PART_NUM}/${TOTAL_PARTS} terkirim"
      rm -f "$PART_FILE"
      return 0
    fi
    log "part ${PART_NUM} percobaan ${ATTEMPT} gagal (HTTP ${HTTP_CODE}), dicoba lagi..."
    sleep 2
  done
  rm -f "$PART_FILE"
  return 1
}

FAILED_PARTS=0
for PART_NUM in $(echo "$SESSION" | jq -r '.data.missingParts[]?'); do
  upload_part "$PART_NUM" || FAILED_PARTS=$((FAILED_PARTS + 1))
done
[ "$FAILED_PARTS" -eq 0 ] || die "${FAILED_PARTS} part gagal terkirim setelah retry"

# ---------------------------------------------------------------- verifikasi
STATUS=$(curl -fsS -H "x-api-key: ${DEPLOYMENT_CI_KEY}" "${API}/uploads/${UPLOAD_ID}")
MISSING_COUNT=$(echo "$STATUS" | jq '.data.missingParts | length')
if [ "$MISSING_COUNT" != "0" ]; then
  log "masih ada ${MISSING_COUNT} part hilang — abort sesi."
  curl -fsS -X DELETE -H "x-api-key: ${DEPLOYMENT_CI_KEY}" \
    "${API}/uploads/${UPLOAD_ID}" >/dev/null || true
  die "upload tidak lengkap"
fi

# ---------------------------------------------------------------- complete
RESULT=$(curl -fsS -X POST -H "x-api-key: ${DEPLOYMENT_CI_KEY}" \
  "${API}/uploads/${UPLOAD_ID}/complete") || die "complete gagal"
RELEASE_STATUS=$(echo "$RESULT" | jq -r '.data.status')
[ "$RELEASE_STATUS" = "PUBLISHED" ] || die "status release ${RELEASE_STATUS}, bukan PUBLISHED"

log "release ${APPLICATION} ${VERSION} PUBLISHED ✓"
