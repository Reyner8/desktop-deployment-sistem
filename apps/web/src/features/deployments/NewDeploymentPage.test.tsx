import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DeviceStatus, ReleaseStatus } from '@rscb/shared';
import { NewDeploymentPage } from './NewDeploymentPage';
import { useDevices, type Device } from '@/lib/query/devices';
import { useReleases } from '@/lib/query/releases';
import { useCreateDeployment } from '@/lib/query/deployments';

vi.mock('@/lib/query/devices', async () => ({
  ...(await vi.importActual<typeof import('@/lib/query/devices')>('@/lib/query/devices')),
  useDevices: vi.fn(),
}));
vi.mock('@/lib/query/releases', async () => ({
  ...(await vi.importActual<typeof import('@/lib/query/releases')>('@/lib/query/releases')),
  useReleases: vi.fn(),
}));
vi.mock('@/lib/query/deployments', async () => ({
  ...(await vi.importActual<typeof import('@/lib/query/deployments')>('@/lib/query/deployments')),
  useCreateDeployment: vi.fn(),
}));

const device: Device = {
  id: 'dev-1',
  deviceId: 'UNIT-01',
  hostname: 'unit-01',
  ipAddress: '10.0.0.5',
  os: 'Windows 11',
  agentVersion: '0.1.0',
  applicationVersion: '1.4.9',
  lastSeen: new Date().toISOString(),
  status: DeviceStatus.ONLINE,
  isActive: true,
};

function mockQueries(opts: { total?: number } = {}) {
  const releases = [
    { id: 'rel-1', application: 'simrs', version: '1.5.0', status: ReleaseStatus.PUBLISHED },
  ];
  vi.mocked(useReleases).mockReturnValue({
    data: { data: releases, total: 1, page: 1, limit: 100, totalPages: 1 },
    isLoading: false,
  } as unknown as ReturnType<typeof useReleases>);
  vi.mocked(useDevices).mockReturnValue({
    data: { data: [device], total: opts.total ?? 1, page: 1, limit: 100, totalPages: 1 },
    isLoading: false,
  } as unknown as ReturnType<typeof useDevices>);
  vi.mocked(useCreateDeployment).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateDeployment>);
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/deployments/new']}>
        <NewDeploymentPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Buka Radix Select dan pilih opsi berdasarkan teksnya. */
async function pilihOpsiSelect(text: RegExp) {
  const trigger = screen.getByRole('combobox');
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const option = await screen.findByRole('option', { name: text }, { timeout: 3000 });
  fireEvent.pointerDown(option, { button: 0 });
  fireEvent.pointerUp(option, { button: 0 });
  fireEvent.click(option);
  // Radix merender teks opsi terpilih ke dalam SelectValue.
  await screen.findByText(text, { selector: '[data-radix-popper-content=""] span, span' }, { timeout: 3000 });
}

describe('NewDeploymentPage — alur pilih release dan device', () => {
  beforeEach(() => {
    mockQueries();
  });

  it('menonaktifkan tombol Next sebelum release dipilih', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /next: select devices/i })).toBeDisabled();
  });

  it('membuka daftar device setelah release dipilih dan bisa memilih semua', async () => {
    renderPage();

    await pilihOpsiSelect(/simrs - 1\.5\.0/i);

    const nextButton = screen.getByRole('button', { name: /next: select devices/i });
    expect(nextButton).toBeEnabled();
    fireEvent.click(nextButton);

    // Langkah 2: daftar device tampil.
    expect(await screen.findByText('unit-01')).toBeInTheDocument();

    // Klik baris memilih device — karena hanya satu device visible,
    // tombol langsung berubah menjadi 'Deselect All'.
    const row = screen.getByText('unit-01').closest('tr')!;
    fireEvent.click(row);
    expect(within(row).getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Deselect All' })).toBeInTheDocument();

    // Deselect All mengosongkan pilihan kembali.
    fireEvent.click(screen.getByRole('button', { name: 'Deselect All' }));
    expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument();
    expect(within(row).getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('memberi tahu bila daftar device terpotong dan pencarian tersedia', async () => {
    mockQueries({ total: 250 });
    renderPage();

    await pilihOpsiSelect(/simrs - 1\.5\.0/i);
    fireEvent.click(await screen.findByRole('button', { name: /next: select devices/i }));

    // Regresi: hasil pencarian server-side yang terpotong harus dijelaskan,
    // jangan diam-diam menyembunyikan device lain.
    expect(await screen.findByText(/1 dari 250 device/)).toBeInTheDocument();
  });
});
