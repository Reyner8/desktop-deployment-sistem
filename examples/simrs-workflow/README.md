# Template workflow untuk repo SIMRS (`rscb-simrs`)

Salin file `build-and-deploy.yml` ke repo SIMRS di
`.github/workflows/build-and-deploy.yml`. Workflow memanggil script
`ci-publish.sh` dari repo deployment system ini (sumber tunggal logika
upload chunked — perbaikan di satu tempat otomatis dipakai semua repo).

## Secrets yang perlu diisi di repo SIMRS

| Secret                | Contoh                            | Keterangan                                 |
| --------------------- | --------------------------------- | ------------------------------------------ |
| `DEPLOYMENT_URL`      | `https://deploy.rscb.example.com` | Base URL backend deployment server         |
| `DEPLOYMENT_CI_KEY`   | (nilai CI_API_KEY backend)        | Jangan pernah di-commit                    |

## Versi

Versi diambil dari tag git semver: `git tag v1.5.0 && git push --tags`
memicu build dan mem-publish release `1.5.0`.

## Uji lokal tanpa GitHub

```bash
export DEPLOYMENT_URL=http://localhost:3000
export DEPLOYMENT_CI_KEY=<CI_API_KEY dari .env>
./scripts/ci-publish.sh simrs-1.5.0.zip SIMRS 1.5.0
```
