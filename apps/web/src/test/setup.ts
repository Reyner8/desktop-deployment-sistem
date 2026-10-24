import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom tidak menyediakan API yang dipakai Radix UI saat membuka Select
// dan komponen overlay lainnya — tanpa stub ini tree bisa crash di test.
Element.prototype.scrollIntoView = vi.fn();
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

afterEach(() => {
  cleanup();
  localStorage.clear();
});
