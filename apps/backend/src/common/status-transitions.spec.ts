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
});
