import {
  DeploymentStatus,
  ReleaseStatus,
  deploymentTransitions,
  releaseTransitions,
} from '@rscb/shared';

describe('release transitions', () => {
  it('allows DRAFT -> UPLOADING dan DRAFT -> ARCHIVED', () => {
    const allowed = releaseTransitions.get(ReleaseStatus.DRAFT) || [];
    expect(allowed).toContain(ReleaseStatus.UPLOADING);
    expect(allowed).toContain(ReleaseStatus.ARCHIVED);
  });

  it('allows PUBLISHED -> ARCHIVED dan ARCHIVED terminal', () => {
    expect(releaseTransitions.get(ReleaseStatus.PUBLISHED)).toContain(ReleaseStatus.ARCHIVED);
    expect(releaseTransitions.get(ReleaseStatus.ARCHIVED)).toEqual([]);
  });

  it('rejects publish dari ARCHIVED', () => {
    const allowed = releaseTransitions.get(ReleaseStatus.ARCHIVED) || [];
    expect(allowed).not.toContain(ReleaseStatus.PUBLISHED);
  });

  it('allows retry upload dari FAILED', () => {
    expect(releaseTransitions.get(ReleaseStatus.FAILED)).toContain(ReleaseStatus.UPLOADING);
  });
});

describe('deployment transitions', () => {
  it('allows cancel dari PENDING, ASSIGNED, dan FAILED', () => {
    expect(deploymentTransitions.get(DeploymentStatus.PENDING)).toContain(
      DeploymentStatus.CANCELLED,
    );
    expect(deploymentTransitions.get(DeploymentStatus.ASSIGNED)).toContain(
      DeploymentStatus.CANCELLED,
    );
    expect(deploymentTransitions.get(DeploymentStatus.FAILED)).toContain(
      DeploymentStatus.CANCELLED,
    );
  });

  it('rejects SUCCESS -> DOWNLOADING', () => {
    const allowed = deploymentTransitions.get(DeploymentStatus.SUCCESS) || [];
    expect(allowed).not.toContain(DeploymentStatus.DOWNLOADING);
    expect(allowed).toHaveLength(0);
  });

  it('menjaga terminal state tetap terminal', () => {
    expect(deploymentTransitions.get(DeploymentStatus.SUCCESS)).toEqual([]);
    expect(deploymentTransitions.get(DeploymentStatus.CANCELLED)).toEqual([]);
  });

  it('allows VERIFYING -> WAITING dan WAITING -> INSTALLING', () => {
    expect(deploymentTransitions.get(DeploymentStatus.VERIFYING)).toContain(
      DeploymentStatus.WAITING,
    );
    expect(deploymentTransitions.get(DeploymentStatus.WAITING)).toContain(
      DeploymentStatus.INSTALLING,
    );
  });

  // Agent lama yang tidak mengirim WAITING harus tetap bisa jalan.
  it('tetap allows VERIFYING -> INSTALLING untuk agent lama', () => {
    expect(deploymentTransitions.get(DeploymentStatus.VERIFYING)).toContain(
      DeploymentStatus.INSTALLING,
    );
  });

  it('allows cancel dari WAITING supaya tidak terjebak permanen', () => {
    expect(deploymentTransitions.get(DeploymentStatus.WAITING)).toContain(
      DeploymentStatus.CANCELLED,
    );
  });

  it('rejects WAITING sebagai status awal', () => {
    expect(deploymentTransitions.has(DeploymentStatus.PENDING)).toBe(true);
    expect(deploymentTransitions.get(DeploymentStatus.PENDING)).not.toContain(
      DeploymentStatus.WAITING,
    );
  });
});
