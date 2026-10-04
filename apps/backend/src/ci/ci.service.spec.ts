import { Readable } from 'stream';
import * as crypto from 'crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CiService } from './ci.service';
import { UploadSession, UploadSessionStatus } from './entities/upload-session.entity';
import { CI_PART_SIZE } from './ci.constants';
import { ReleaseStatus } from '@rscb/shared';

function createHarness() {
  const sessionRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((s: any) => ({ id: 'sess-new', ...s })),
    save: jest.fn().mockImplementation(async (s: any) => s),
  };
  const releaseRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((r: any) => ({ ...r })),
    save: jest.fn().mockImplementation(async (r: any) => ({ id: 'rel-new', ...r })),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const releaseService = {
    findOne: jest.fn(),
    publish: jest.fn().mockResolvedValue(undefined),
    findByApplicationVersion: jest.fn().mockResolvedValue(null),
  };
  const artifactService = {
    registerForRelease: jest.fn().mockResolvedValue(undefined),
    getDownloadUrl: jest.fn().mockResolvedValue('http://minio/download'),
  };
  const storage = {
    upload: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    composeParts: jest.fn().mockResolvedValue(undefined),
    getReadStream: jest.fn(),
  };

  const service = new CiService(
    sessionRepository as any,
    releaseRepository as any,
    releaseService as any,
    artifactService as any,
    storage as any,
  );

  return { service, sessionRepository, releaseRepository, releaseService, artifactService, storage };
}

function sessionOf(overrides: Partial<UploadSession> = {}): UploadSession {
  // totalSize 20 byte dengan partSize 16 -> totalParts 2 (part terakhir 4 byte)
  return {
    id: 'sess-1',
    application: 'SIMRS',
    version: '1.5.0',
    fileName: 'simrs-1.5.0.zip',
    mimeType: 'application/zip',
    totalSize: 20,
    sha256: null,
    partSize: 16,
    objectKey: 'SIMRS/1.5.0/1.5.0.zip',
    parts: [],
    status: UploadSessionStatus.INITIATED,
    release: { id: 'rel-1', application: 'SIMRS', version: '1.5.0', status: ReleaseStatus.DRAFT },
    createdAt: new Date(),
    ...overrides,
  } as UploadSession;
}

function fileOf(size: number): Express.Multer.File {
  return { size, buffer: Buffer.alloc(size) } as unknown as Express.Multer.File;
}

const startDto = {
  application: 'SIMRS',
  version: '1.5.0',
  fileName: 'simrs-1.5.0.zip',
  mimeType: 'application/zip',
  totalSize: 20,
  sha256: null,
};

describe('CiService.start', () => {
  it('membuat sesi baru untuk release yang belum ada', async () => {
    const { service, sessionRepository } = createHarness();

    const result = await service.start({ ...startDto });

    expect(result.uploadId).toBe('sess-new');
    expect(result.partSize).toBe(CI_PART_SIZE);
    expect(result.totalParts).toBe(Math.ceil(20 / CI_PART_SIZE));
    expect(result.missingParts).toHaveLength(result.totalParts);
    expect(result.status).toBe(UploadSessionStatus.INITIATED);
    expect(sessionRepository.create).toHaveBeenCalled();
  });

  it('menolak release yang sudah PUBLISHED atau ARCHIVED', async () => {
    const { service, releaseRepository } = createHarness();
    releaseRepository.findOne.mockResolvedValue({
      id: 'rel-1',
      application: 'SIMRS',
      version: '1.5.0',
      status: ReleaseStatus.PUBLISHED,
    });

    await expect(service.start({ ...startDto })).rejects.toThrow(ConflictException);

    releaseRepository.findOne.mockResolvedValue({
      id: 'rel-1',
      application: 'SIMRS',
      version: '1.5.0',
      status: ReleaseStatus.ARCHIVED,
    });
    await expect(service.start({ ...startDto })).rejects.toThrow(ConflictException);
  });

  it('melanjutkan sesi INITIATED yang sedang berjalan (resume lintas run)', async () => {
    const { service, sessionRepository, releaseRepository } = createHarness();
    releaseRepository.findOne.mockResolvedValue({
      id: 'rel-1',
      application: 'SIMRS',
      version: '1.5.0',
      status: ReleaseStatus.DRAFT,
    });
    sessionRepository.findOne.mockResolvedValue(
      sessionOf({ parts: [{ part: 1, size: 16 }] }),
    );

    const result = await service.start({ ...startDto });

    expect(result.uploadId).toBe('sess-1');
    expect(result.uploadedParts).toEqual([1]);
    expect(result.missingParts).toEqual([2]);
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  it('membersihkan part sesi FAILED lama lalu membuat sesi baru', async () => {
    const { service, sessionRepository, releaseRepository, storage } = createHarness();
    releaseRepository.findOne.mockResolvedValue({
      id: 'rel-1',
      application: 'SIMRS',
      version: '1.5.0',
      status: ReleaseStatus.DRAFT,
    });
    const failed = sessionOf({
      status: UploadSessionStatus.FAILED,
      parts: [{ part: 1, size: 16 }],
    });
    sessionRepository.findOne.mockResolvedValue(failed);

    const result = await service.start({ ...startDto });

    expect(storage.delete).toHaveBeenCalledWith('SIMRS/1.5.0/1.5.0.zip.parts/1');
    expect(result.uploadId).toBe('sess-new');
    expect(sessionRepository.create).toHaveBeenCalled();
  });

  it('menghapus object compose sesi COMPLETING yang tertinggal', async () => {
    const { service, sessionRepository, releaseRepository, storage } = createHarness();
    releaseRepository.findOne.mockResolvedValue({
      id: 'rel-1',
      application: 'SIMRS',
      version: '1.5.0',
      status: ReleaseStatus.DRAFT,
    });
    sessionRepository.findOne.mockResolvedValue(
      sessionOf({ status: UploadSessionStatus.COMPLETING }),
    );

    await service.start({ ...startDto });

    expect(storage.delete).toHaveBeenCalledWith('SIMRS/1.5.0/1.5.0.zip');
  });
});

describe('CiService.uploadPart', () => {
  it('menolak upload saat sesi bukan INITIATED', async () => {
    const { service, sessionRepository } = createHarness();
    sessionRepository.findOne.mockResolvedValue(
      sessionOf({ status: UploadSessionStatus.COMPLETING }),
    );

    await expect(service.uploadPart('sess-1', 1, fileOf(16))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('menolak nomor part melebihi total part yang diharapkan', async () => {
    const { service, sessionRepository } = createHarness();
    sessionRepository.findOne.mockResolvedValue(sessionOf());

    await expect(service.uploadPart('sess-1', 3, fileOf(4))).rejects.toThrow(
      /exceeds expected total parts/,
    );
  });

  it('re-upload part dengan nomor sama menimpa part lama', async () => {
    const { service, sessionRepository, storage } = createHarness();
    const session = sessionOf({ parts: [{ part: 1, size: 10 }] });
    sessionRepository.findOne.mockResolvedValue(session);

    await service.uploadPart('sess-1', 1, fileOf(16));

    expect(storage.upload).toHaveBeenCalledWith(
      expect.anything(),
      'SIMRS/1.5.0/1.5.0.zip.parts/1',
    );
    expect(session.parts).toEqual([{ part: 1, size: 16 }]);
    expect(sessionRepository.save).toHaveBeenCalled();
  });
});

describe('CiService.complete', () => {
  it('mengembalikan release yang sudah COMPLETED tanpa compose ulang', async () => {
    const { service, sessionRepository, releaseService, storage } = createHarness();
    sessionRepository.findOne.mockResolvedValue(
      sessionOf({ status: UploadSessionStatus.COMPLETED }),
    );
    releaseService.findOne.mockResolvedValue({
      id: 'rel-1',
      artifact: { fileName: 'simrs-1.5.0.zip' },
    });

    const result = await service.complete('sess-1');

    expect(result.downloadUrl).toBe('http://minio/download');
    expect(storage.composeParts).not.toHaveBeenCalled();
  });

  it('menolak complete saat masih ada part yang hilang', async () => {
    const { service, sessionRepository } = createHarness();
    sessionRepository.findOne.mockResolvedValue(
      sessionOf({ parts: [{ part: 1, size: 16 }] }),
    );

    await expect(service.complete('sess-1')).rejects.toThrow(/Missing parts/);
  });

  it('menolak complete saat total size part tidak cocok', async () => {
    const { service, sessionRepository } = createHarness();
    sessionRepository.findOne.mockResolvedValue(
      sessionOf({ parts: [{ part: 1, size: 16 }, { part: 2, size: 5 }] }),
    );

    await expect(service.complete('sess-1')).rejects.toThrow(/does not match total size/);
  });

  it('compose, verifikasi SHA-256 read-back, lalu publish release', async () => {
    const { service, sessionRepository, releaseService, artifactService, storage } = createHarness();
    const buffer = Buffer.alloc(20, 7);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const session = sessionOf({
      sha256,
      parts: [{ part: 1, size: 16 }, { part: 2, size: 4 }],
    });
    sessionRepository.findOne.mockResolvedValue(session);
    storage.getReadStream.mockResolvedValue(Readable.from([buffer]));
    releaseService.findOne.mockResolvedValue({
      id: 'rel-1',
      artifact: { fileName: 'simrs-1.5.0.zip' },
    });

    const result = await service.complete('sess-1');

    expect(storage.composeParts).toHaveBeenCalledWith(
      ['SIMRS/1.5.0/1.5.0.zip.parts/1', 'SIMRS/1.5.0/1.5.0.zip.parts/2'],
      'SIMRS/1.5.0/1.5.0.zip',
    );
    expect(artifactService.registerForRelease).toHaveBeenCalledWith(
      'rel-1',
      expect.objectContaining({ size: 20, sha256, objectKey: 'SIMRS/1.5.0/1.5.0.zip' }),
      'ci',
    );
    expect(releaseService.publish).toHaveBeenCalledWith('rel-1', 'ci');
    expect(session.status).toBe(UploadSessionStatus.COMPLETED);
    expect(result.downloadUrl).toBe('http://minio/download');
  });

  it('menandai sesi FAILED dan membersihkan object saat SHA-256 mismatch', async () => {
    const { service, sessionRepository, releaseService, storage } = createHarness();
    const buffer = Buffer.alloc(20, 7);
    const session = sessionOf({
      sha256: '0'.repeat(64),
      parts: [{ part: 1, size: 16 }, { part: 2, size: 4 }],
    });
    sessionRepository.findOne.mockResolvedValue(session);
    storage.getReadStream.mockResolvedValue(Readable.from([buffer]));
    releaseService.findOne.mockResolvedValue({ id: 'rel-1' });

    await expect(service.complete('sess-1')).rejects.toThrow(/SHA-256 mismatch/);

    expect(storage.delete).toHaveBeenCalledWith('SIMRS/1.5.0/1.5.0.zip');
    expect(storage.delete).toHaveBeenCalledWith('SIMRS/1.5.0/1.5.0.zip.parts/1');
    expect(storage.delete).toHaveBeenCalledWith('SIMRS/1.5.0/1.5.0.zip.parts/2');
    expect(session.status).toBe(UploadSessionStatus.FAILED);
    expect(releaseService.publish).not.toHaveBeenCalled();
  });
});

describe('CiService.abort', () => {
  it('menghapus semua part dan release terkait', async () => {
    const { service, sessionRepository, releaseRepository, storage } = createHarness();
    const session = sessionOf({ parts: [{ part: 1, size: 16 }, { part: 2, size: 4 }] });
    sessionRepository.findOne.mockResolvedValue(session);

    const result = await service.abort('sess-1');

    expect(storage.delete).toHaveBeenCalledTimes(2);
    expect(releaseRepository.remove).toHaveBeenCalledWith(session.release);
    expect(result.status).toBe(UploadSessionStatus.ABORTED);
  });

  it('menolak abort sesi yang sudah COMPLETED', async () => {
    const { service, sessionRepository } = createHarness();
    sessionRepository.findOne.mockResolvedValue(
      sessionOf({ status: UploadSessionStatus.COMPLETED }),
    );

    await expect(service.abort('sess-1')).rejects.toThrow(/Cannot abort/);
  });
});
