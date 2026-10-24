/**
 * E2E jalur lengkap: health → register agent → CI chunked upload →
 * PUBLISHED → login admin → deployment → agent updates → laporan status
 * sampai SUCCESS → toleransi laporan ulang → change-password.
 *
 * Butuh PostgreSQL nyata (entity memakai enum postgres). Siapkan:
 *   docker compose up -d postgres
 *   createdb rscb_e2e  (atau DB apa pun yang DATABASE_URL tunjuk)
 * Jalankan:
 *   DATABASE_URL=postgresql://postgres:<pw>@localhost:5432/rscb_e2e \
 *   ADMIN_PASSWORD=e2e-admin-pass CI_API_KEY=e2e-ci-key JWT_SECRET=e2e-jwt \
 *   npm run test:e2e
 * Migration TypeORM berjalan otomatis saat module start (migrationsRun).
 * Di CI (ci.yml) service postgres sudah disiapkan.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';

describe('Deployment system (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let deviceToken: string;
  let deviceId = '';
  let releaseId = '';
  let lastDeploymentId = '';

  const CI_KEY = process.env.CI_API_KEY || 'e2e-ci-key';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'e2e-admin-pass';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // main.ts tidak ikut terpanggil di test — replikasi setup pentingnya.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('health mengecek DB dan merespons 200', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('agent register menghasilkan token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/agents/register')
      .send({
        deviceId: 'UNIT-E2E',
        hostname: 'unit-e2e',
        os: 'Windows 11',
        agentVersion: '0.1.0',
      })
      .expect(201);
    expect(res.body.data.token).toBeTruthy();
    deviceToken = res.body.data.token;
    deviceId = res.body.data.deviceId;
  });

  it('CI upload chunked → complete → PUBLISHED', async () => {
    // zip kecil berisi file supaya melalui jalur compose + verifikasi sha256.
    const zipBuffer = makeSmallZip();
    const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');

    const start = await request(app.getHttpServer())
      .post('/api/v1/ci/uploads')
      .set('x-api-key', CI_KEY)
      .send({
        application: 'SIMRS',
        version: `9.9.9-e2e-${Date.now()}`,
        fileName: 'simrs-e2e.zip',
        mimeType: 'application/zip',
        totalSize: zipBuffer.length,
        sha256,
      })
      .expect(201);
    const uploadId = start.body.data.uploadId;
    releaseId = start.body.data.releaseId;

    await request(app.getHttpServer())
      .post(`/api/v1/ci/uploads/${uploadId}/parts/1`)
      .set('x-api-key', CI_KEY)
      .attach('file', zipBuffer, 'part_1')
      .expect(201);

    const complete = await request(app.getHttpServer())
      .post(`/api/v1/ci/uploads/${uploadId}/complete`)
      .set('x-api-key', CI_KEY)
      .expect(201);
    expect(complete.body.data.status).toBe('PUBLISHED');
  });

  it('login admin menghasilkan JWT dengan role', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: process.env.ADMIN_USERNAME || 'admin', password: ADMIN_PASSWORD })
      .expect(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('ADMIN');
    adminToken = res.body.token;
  });

  it('deployment dibuat dan agent melihat ASSIGNED di /agents/updates', async () => {
    const devices = await request(app.getHttpServer())
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const device = devices.body.data.data.find((d: any) => d.deviceId === deviceId);
    expect(device).toBeTruthy();

    const created = await request(app.getHttpServer())
      .post('/api/v1/deployments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ releaseId, deviceIds: [device.id] })
      .expect(201);
    expect(created.body.data).toHaveLength(1);

    const updates = await request(app.getHttpServer())
      .get('/api/v1/agents/updates')
      .set('x-api-key', deviceToken)
      .expect(200);
    expect(updates.body.data.deploymentStatus).toBe('ASSIGNED');
    expect(updates.body.data.hasUpdate).toBe(true);
  });

  it('laporan status mengikuti state machine sampai SUCCESS', async () => {
    const updates = await request(app.getHttpServer())
      .get('/api/v1/agents/updates')
      .set('x-api-key', deviceToken)
      .expect(200);
    const deploymentId = updates.body.data.deploymentId;
    expect(deploymentId).toBeTruthy();
    lastDeploymentId = deploymentId;

    for (const status of ['DOWNLOADING', 'VERIFYING', 'INSTALLING', 'STARTING', 'SUCCESS']) {
      await request(app.getHttpServer())
        .post(`/api/v1/agents/deployments/${deploymentId}/status`)
        .set('x-api-key', deviceToken)
        .send({ status, message: `e2e ${status}` })
        .expect(201);
    }

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/deployments/${deploymentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.data.status).toBe('SUCCESS');
  });

  it('laporan ulang ke deployment terminal dijawab no-op 200', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/agents/deployments/${lastDeploymentId}/status`)
      .set('x-api-key', deviceToken)
      .send({ status: 'FAILED', errorMessage: 'laporan stale' })
      .expect(201);
    // controller membungkus: {success, data: {status: 'ok'}}
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('token asing tidak bisa melapor ke deployment device lain', async () => {
    const other = await request(app.getHttpServer())
      .post('/api/v1/agents/register')
      .send({
        deviceId: 'UNIT-E2E-LAIN',
        hostname: 'unit-e2e-lain',
        agentVersion: '0.1.0',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/agents/deployments/${lastDeploymentId}/status`)
      .set('x-api-key', other.body.data.token)
      .send({ status: 'SUCCESS' })
      .expect(403);
  });

  it('change-password lalu login dengan password baru', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: 'e2e-password-baru' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: 'e2e-password-baru',
      })
      .expect(200);

    // kembalikan password supaya run e2e berikutnya tetap jalan
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'e2e-password-baru', newPassword: ADMIN_PASSWORD })
      .expect(200);
  });
});

/** ZIP minimal valid: satu file teks, tanpa dependensi eksternal. */
function makeSmallZip(): Buffer {
  const name = Buffer.from('application.jar');
  const data = Buffer.from('e2e versi baru');

  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
  const crcValue = (crc ^ -1) >>> 0;

  const local = Buffer.alloc(30 + name.length + data.length);
  local.writeUInt32LE(0x04034b50, 0); // local file header signature
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt32LE(crcValue, 14);
  local.writeUInt32LE(data.length, 18); // compressed size
  local.writeUInt32LE(data.length, 22); // uncompressed size
  local.writeUInt16LE(name.length, 26);
  name.copy(local, 30);
  data.copy(local, 30 + name.length);

  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50, 0); // central directory signature
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crcValue, 16);
  central.writeUInt32LE(data.length, 20); // compressed size
  central.writeUInt32LE(data.length, 24); // uncompressed size
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42); // local header offset
  name.copy(central, 46);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // end of central directory
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(local.length, 16);

  return Buffer.concat([local, central, eocd]);
}
