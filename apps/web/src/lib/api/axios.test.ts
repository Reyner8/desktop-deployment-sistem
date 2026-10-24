import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { normalizeApiError, getErrorMessage } from './axios';

function axiosErrorWith(status: number, data: unknown): AxiosError {
  return new AxiosError('Request failed with status code ' + status, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() } as never,
    data,
  } as never);
}

describe('normalizeApiError', () => {
  it('mengekstrak status dan message array dari response backend', () => {
    const error = axiosErrorWith(400, {
      message: ['version is required', 'application is required'],
      error: 'Bad Request',
    });

    expect(normalizeApiError(error)).toEqual({
      status: 400,
      message: 'version is required, application is required',
      code: 'Bad Request',
    });
  });

  it('memakai message string dari body', () => {
    const error = axiosErrorWith(409, { message: 'Release already published' });

    const result = normalizeApiError(error);
    expect(result.status).toBe(409);
    expect(result.message).toBe('Release already published');
  });

  it('fallback ke pesan axios bila body tanpa message', () => {
    const error = axiosErrorWith(500, null);

    expect(normalizeApiError(error).message).toBe('Request failed with status code 500');
  });

  it('Error biasa dipetakan tanpa status', () => {
    const result = normalizeApiError(new Error('koneksi putus'));

    expect(result).toEqual({ status: null, message: 'koneksi putus' });
  });

  it('nilai yang bukan Error menghasilkan pesan generik', () => {
    expect(getErrorMessage('apa-apa')).toBe('Unexpected error');
  });
});
