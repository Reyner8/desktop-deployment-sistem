# CI/CD: Build SIMRS → Deployment Server

Dokumentasi ini menjelaskan alur pipeline dari build SIMRS di GitHub Action
sampai artifact tersimpan di Deployment Server dan siap di-distribusikan ke unit.

## Arsitektur Alur

```
┌──────────────────────┐       POST /api/v1/ci/uploads (chunked)
│  GitHub Actions      │ ──────────────────────────────────────────►
│  (repo SIMRS)        │       POST .../complete
│                      │ ──────────────────────────────────────────►
│  build → zip → sha   │       GET .../releases (idempoten)
└──────────────────────┘ ◄─────────────────────────────────────────┘
                                  │
                                  │  backend menyimpan ke MinIO
                                  │  + membuat Release PUBLISHED
                                  │  + downloadUrl (presigned)
                                  ▼
                    ┌──────────────────────────────┐
                    │  Deployment Server            │
                    │  (backend + MinIO + PostgreSQL)│
                    └──────────────┬───────────────┘
                                   │ agent GET /agents/updates
                                   ▼
                    ┌──────────────────────────────┐
                    │  Agent SIMRS (per unit)       │
                    │  download → SHA-256 → replace │
                    └──────────────────────────────┘
```

**Prinsip utama:** GitHub tidak pernah menyentuh MinIO credential.
Backend satu-satunya yang mengelola bucket. GitHub hanya perlu
`base URL` + `CI_API_KEY`.

## Persiapan Backend

### 1. Set CI_API_KEY di environment

```bash
# docker-compose.yml (dev)
CI_API_KEY: my-super-secret-ci-key-change-me

# docker-compose.prod.yml (production)
CI_API_KEY: ${CI_API_KEY}   # isi dari env host / GitHub Secrets
```

### 2. Endpoint CI (semua butuh header `x-api-key`)

| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/v1/ci/uploads` | Buka sesi upload + buat release DRAFT |
| POST | `/api/v1/ci/uploads/:id/parts/:partNumber` | Kirim chunk (≤ 16MB) |
| GET | `/api/v1/ci/uploads/:id` | Cek status & missing parts (resume) |
| POST | `/api/v1/ci/uploads/:id/complete` | Finalisasi → PUBLISHED + downloadUrl |
| DELETE | `/api/v1/ci/uploads/:id` | Batalkan sesi & hapus release |
| GET | `/api/v1/ci/releases?application=&version=&status=PUBLISHED` | Cek apakah release sudah di-publish |

### 3. Response `complete`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "application": "SIMRS",
    "version": "1.5.0",
    "status": "PUBLISHED",
    "artifact": {
      "fileName": "simrs-1.5.0.zip",
      "size": 524288000,
      "sha256": "a1b2c3..."
    },
    "downloadUrl": "http://minio:9000/rscb-artifacts/...?X-Amz-..."
  }
}
```

## Template GitHub Actions Workflow

Template workflow berikut ditempatkan di repo **SIMRS** (`rscb-simrs`),
bukan di repo deployment system ini.

```yaml
# .github/workflows/build-and-deploy.yml
name: Build & Deploy to RSCB

on:
  push:
    tags:
      - 'v*'

env:
  VERSION: ${GITHUB_REF_NAME#v}
  DEPLOYMENT_URL: ${{ secrets.DEPLOYMENT_URL }}
  DEPLOYMENT_CI_KEY: ${{ secrets.DEPLOYMENT_CI_KEY }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Build SIMRS
        run: |
          chmod +x gradlew
          ./gradlew clean build -x test

      - name: Create ZIP artifact
        run: |
          zip -r simrs-${{ env.VERSION }}.zip \
            build/libs/*.jar \
            config/ \
            lib/ \
            report/ \
            suara/ \
            run.bat

      - name: Calculate SHA-256
        run: |
          SHA=$(sha256sum simrs-${{ env.VERSION }}.zip | cut -d' ' -f1)
          echo "SHA256=$SHA" >> $GITHUB_ENV
          echo "SHA-256: $SHA"

      - name: Check if release already exists
        id: check_release
        run: |
          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "x-api-key: ${{ env.DEPLOYMENT_CI_KEY }}" \
            "${{ env.DEPLOYMENT_URL }}/api/v1/ci/releases?application=SIMRS&version=${{ env.VERSION }}&status=PUBLISHED")
          if [ "$HTTP_CODE" = "200" ]; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
          fi

      - name: Upload chunked to Deployment Server
        if: steps.check_release.outputs.exists != 'true'
        run: |
          FILE_SIZE=$(stat -c%s "simrs-${{ env.VERSION }}.zip")

          # Start upload session. Backend menentukan partSize (default 16MB,
          # min 5MB) dan dikembalikan di respons supaya selaras selamanya.
          SESSION=$(curl -s -X POST \
            -H "x-api-key: ${{ env.DEPLOYMENT_CI_KEY }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"application\": \"SIMRS\",
              \"version\": \"${{ env.VERSION }}\",
              \"fileName\": \"simrs-${{ env.VERSION }}.zip\",
              \"mimeType\": \"application/zip\",
              \"totalSize\": ${FILE_SIZE},
              \"sha256\": \"${{ env.SHA256 }}\"
            }" \
            "${{ env.DEPLOYMENT_URL }}/api/v1/ci/uploads")

          echo "Session response: $SESSION"
          UPLOAD_ID=$(echo $SESSION | jq -r '.data.uploadId')
          PART_SIZE=$(echo $SESSION | jq -r '.data.partSize // 16777216')
          TOTAL_PARTS=$(echo $SESSION | jq -r '.data.totalParts // 1')
          echo "UPLOAD_ID=$UPLOAD_ID PART_SIZE=$PART_SIZE TOTAL_PARTS=$TOTAL_PARTS"

          # Resume: hanya upload part yang belum ada (missingParts).
          # uploadedParts berisi nomor part yang sudah diterima backend.
          MISSING=$(echo $SESSION | jq -r '.data.missingParts // [1] | .[]')
          if [ -z "$MISSING" ]; then
            echo "Semua ${TOTAL_PARTS} part sudah terupload."
          fi

          for PART_NUM in $MISSING; do
            SKIP=$(( (PART_NUM - 1) * PART_SIZE ))
            PART_FILE="part_${PART_NUM}"
            # Banyak byte yang tersisa dari offset SKIP. Untuk part terakhir
            # bisa kurang dari PART_SIZE.
            REMAINING=$(( FILE_SIZE - SKIP ))
            if [ $REMAINING -gt $PART_SIZE ]; then REMAINING=$PART_SIZE; fi
            # dd dengan iflag=skip_bytes,count_bytes: skip & count dalam byte
            # (bukan jumlah blok). Cepat karena bs besar (bukan bs=1), sekaligus
            # aman untuk part terakhir yang lebih kecil dari PART_SIZE — dd
            # membaca sampai EOF dan berhenti normal tanpa status error.
            dd if=simrs-${{ env.VERSION }}.zip of=$PART_FILE \
              bs=$PART_SIZE skip=$SKIP count=$REMAINING \
              iflag=skip_bytes,count_bytes 2>/dev/null || true
            ACTUAL=$(stat -c%s "$PART_FILE" 2>/dev/null || echo 0)
            if [ "$ACTUAL" -ne "$REMAINING" ]; then
              echo "ERROR: Part ${PART_NUM} size ${ACTUAL}, expected ${REMAINING}."
              exit 1
            fi

            for ATTEMPT in 1 2 3; do
              HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                -X POST \
                -H "x-api-key: ${{ env.DEPLOYMENT_CI_KEY }}" \
                -F "file=@${PART_FILE}" \
                "${{ env.DEPLOYMENT_URL }}/api/v1/ci/uploads/${UPLOAD_ID}/parts/${PART_NUM}")
              if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
                echo "Part ${PART_NUM}/${TOTAL_PARTS} uploaded"
                break
              fi
              echo "Part ${PART_NUM} attempt ${ATTEMPT} failed (HTTP ${HTTP_CODE}), retrying..."
              sleep 2
            done
            rm -f $PART_FILE
          done

          # Verify status (optional, untuk resume)
          STATUS=$(curl -s \
            -H "x-api-key: ${{ env.DEPLOYMENT_CI_KEY }}" \
            "${{ env.DEPLOYMENT_URL }}/api/v1/ci/uploads/${UPLOAD_ID}")
          echo "Status: $STATUS"

          MISSING=$(echo $STATUS | jq -r '.data.missingParts | length')
          if [ "$MISSING" != "0" ]; then
            echo "ERROR: Missing $MISSING parts after upload. Aborting."
            curl -s -X DELETE \
              -H "x-api-key: ${{ env.DEPLOYMENT_CI_KEY }}" \
              "${{ env.DEPLOYMENT_URL }}/api/v1/ci/uploads/${UPLOAD_ID}"
            exit 1
          fi

          # Complete
          RESULT=$(curl -s -X POST \
            -H "x-api-key: ${{ env.DEPLOYMENT_CI_KEY }}" \
            "${{ env.DEPLOYMENT_URL }}/api/v1/ci/uploads/${UPLOAD_ID}/complete")

          echo "Complete result: $RESULT"
          STATUS=$(echo $RESULT | jq -r '.success')
          if [ "$STATUS" != "true" ]; then
            echo "ERROR: Complete failed."
            exit 1
          fi

          echo "Release ${{ env.VERSION }} published successfully."

      - name: Release already exists (skip)
        if: steps.check_release.outputs.exists == 'true'
        run: |
          echo "Release ${{ env.VERSION }} already exists. Skipping upload."
          RELEASE=$(curl -s \
            -H "x-api-key: ${{ env.DEPLOYMENT_CI_KEY }}" \
            "${{ env.DEPLOYMENT_URL }}/api/v1/ci/releases?application=SIMRS&version=${{ env.VERSION }}&status=PUBLISHED")
          echo "Existing release: $RELEASE"
```

### GitHub Secrets yang diperlukan

| Secret | Contoh | Keterangan |
|--------|--------|------------|
| `DEPLOYMENT_URL` | `https://deploy.rscb.example.com` | Base URL backend |
| `DEPLOYMENT_CI_KEY` | `my-super-secret-ci-key` | Harus sama dengan CI_API_KEY di backend |

### flow resume (jika workflow ter-interrupt)

1. Rerun workflow yang sama.
2. Backend mengembalikan sesi existing (status `INITIATED`) beserta
   `uploadedParts[]` dan `missingParts[]`.
3. Workflow membaca `missingParts[]` dari respons `start()` dan **hanya
   meng-upload part yang belum ada** — part yang sudah terkirim tidak
   diulang.
4. Setelah semua part lengkap, `complete` dijalankan kembali — release
   menjadi `PUBLISHED` dan `downloadUrl` terbentuk.

Catatan: jika release sudah `PUBLISHED`, step "Check if release already
exists" (menggunakan `&status=PUBLISHED`) akan mendeteksinya dan
melewati seluruh proses upload.

## Mode Manual (via Web UI)

Admin juga bisa membuat release dan deploy manual dari dashboard admin
(http://localhost:8080) tanpa GitHub Action. Cukup gunakan menu
**Releases → New Release**, lalu upload ZIP secara manual.

Mode ini menggunakan endpoint yang sama namun dengan upload tunggal
(bukan chunked). Berguna untuk:
- Testing
- Hotfix darurat tanpa CI pipeline
- Versi internal yang tidak di-publish ke GitHub

## Troubleshooting

### 401 "Invalid CI API key"
- Pastikan `CI_API_KEY` di backend sama dengan `DEPLOYMENT_CI_KEY` di GitHub.
- Header harus `x-api-key: <key>` (case-sensitive).

### 413 Request Entity Too Large
- Terjadi bila upload melewati reverse-proxy (Nginx) dan body chunk
  melebihi `client_max_body_size`.
- Pastikan Nginx di `infra/nginx/default.conf` menyetel
  `client_max_body_size` ≥ ukuran part (default backend 16 MiB; contoh
  yang dipakai: `20M`).

### 409 "Missing parts: ..."
- Jalankan `GET /api/v1/ci/uploads/:id` untuk lihat mana part yang belum
  terkirim.
- Upload ulang part tersebut.

### 409 "SHA-256 mismatch"
- File ZIP di GitHub berubah setelah dihitung SHA-256.
- Build harus deterministik; pastikan tidak ada intermediate file yang
  mengubah artefak.

### 409 "Release version already exists"
- Tag yang sama sudah di-publish sebelumnya.
- Gunakan versi baru (tag baru) untuk artifact berbeda.
