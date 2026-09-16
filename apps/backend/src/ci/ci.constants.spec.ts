import { CI_DEFAULT_PART_SIZE, CI_MIN_PART_SIZE, CI_PART_SIZE } from './ci.constants';

describe('ci constants', () => {
  it('default part size 16 MiB', () => {
    expect(CI_DEFAULT_PART_SIZE).toBe(16 * 1024 * 1024);
  });

  it('minimum part size 5 MiB dan nilai efektif tidak di bawah minimum', () => {
    expect(CI_MIN_PART_SIZE).toBe(5 * 1024 * 1024);
    expect(CI_PART_SIZE).toBeGreaterThanOrEqual(CI_MIN_PART_SIZE);
  });
});
