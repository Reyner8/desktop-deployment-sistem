import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PaginationBar } from './pagination-bar';

describe('PaginationBar', () => {
  it('tidak merender apa pun ketika total 0', () => {
    const { container } = render(
      <PaginationBar page={1} total={0} limit={20} onPageChange={vi.fn()} onLimitChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('menampilkan rentang baris dan posisi halaman', () => {
    render(
      <PaginationBar page={2} total={45} limit={20} onPageChange={vi.fn()} onLimitChange={vi.fn()} />,
    );
    expect(screen.getByText('Showing 21-40 of 45')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('Previous disabled di halaman pertama, Next disabled di halaman terakhir', () => {
    const { rerender } = render(
      <PaginationBar page={1} total={45} limit={20} onPageChange={vi.fn()} onLimitChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();

    rerender(
      <PaginationBar page={3} total={45} limit={20} onPageChange={vi.fn()} onLimitChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('klik Next memanggil onPageChange dengan halaman berikutnya', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationBar page={1} total={45} limit={20} onPageChange={onPageChange} onLimitChange={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
