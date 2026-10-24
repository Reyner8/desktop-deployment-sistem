import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeploymentStatus, ReleaseStatus, DeviceStatus } from '@rscb/shared';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    [DeploymentStatus.SUCCESS, 'Success'],
    [DeploymentStatus.FAILED, 'Failed'],
    [DeploymentStatus.WAITING, 'Waiting'],
    [DeviceStatus.ONLINE, 'Online'],
    [DeviceStatus.OFFLINE, 'Offline'],
    [ReleaseStatus.DRAFT, 'Draft'],
    [ReleaseStatus.PUBLISHED, 'Published'],
  ])('menampilkan label untuk status %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // Regresi: VERIFYING dan FAILED release bernilai string sama dengan
  // DeploymentStatus, sehingga harus tampil melalui entri deployment —
  // bukan jatuh ke fallback teks mentah.
  it.each([
    [ReleaseStatus.VERIFYING, 'Verifying'],
    [ReleaseStatus.FAILED, 'Failed'],
  ])('status release %s tampil dengan label yang benar', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('menampilkan teks mentah untuk status yang tidak dikenal', () => {
    render(<StatusBadge status="STATUS_APApun" />);
    expect(screen.getByText('STATUS_APApun')).toBeInTheDocument();
  });
});
