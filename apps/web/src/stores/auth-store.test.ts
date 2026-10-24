import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './auth-store';

const user = { username: 'admin', displayName: 'Administrator' };

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ token: null, user: null });
});

describe('auth-store', () => {
  it('setAuth menyimpan token dan user ke localStorage', () => {
    useAuthStore.getState().setAuth('token-abc', user);

    expect(localStorage.getItem('auth-token')).toBe('token-abc');
    expect(JSON.parse(localStorage.getItem('auth-user')!)).toEqual(user);
    expect(useAuthStore.getState().token).toBe('token-abc');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('logout menghapus token, user, dan localStorage', () => {
    useAuthStore.getState().setAuth('token-abc', user);

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('auth-token')).toBeNull();
    expect(localStorage.getItem('auth-user')).toBeNull();
  });

  it('memulihkan sesi dari localStorage saat modul dimuat', async () => {
    localStorage.setItem('auth-token', 'token-lama');
    localStorage.setItem('auth-user', JSON.stringify(user));

    vi.resetModules();
    const { useAuthStore: freshStore } = await import('./auth-store');

    expect(freshStore.getState().token).toBe('token-lama');
    expect(freshStore.getState().user).toEqual(user);
  });
});
