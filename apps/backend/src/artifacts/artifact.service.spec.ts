import { ArtifactService } from './artifact.service';

function createService(config: Record<string, string> = {}, storage: any = {}) {
  return new ArtifactService(
    {} as any,
    {} as any,
    storage,
    { get: (key: string) => config[key] } as any,
    { log: jest.fn() } as any,
  );
}

describe('ArtifactService', () => {
  it('menghitung SHA-256 secara deterministik', () => {
    const service = createService();
    expect(service.calculateSha256(Buffer.from('hello'))).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('mendeteksi driver local secara default', () => {
    expect(createService().isLocalStorage()).toBe(true);
    expect(createService({ STORAGE_DRIVER: 'minio' }).isLocalStorage()).toBe(false);
  });

  it('mendelegasikan getReadStream ke storage adapter', async () => {
    const getReadStream = jest.fn().mockResolvedValue('stream');
    const service = createService({}, { getReadStream });
    const result = await service.getReadStream({ objectKey: 'simrs/1.5.0/1.5.0.zip' } as any);
    expect(getReadStream).toHaveBeenCalledWith('simrs/1.5.0/1.5.0.zip');
    expect(result).toBe('stream');
  });
});
