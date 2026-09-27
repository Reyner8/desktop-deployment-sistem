import { BadRequestException } from '@nestjs/common';

export type SortOrder = 'ASC' | 'DESC';

/**
 * Susun opsi ORDER BY TypeORM dari parameter query user secara aman.
 *
 * Nama kolom tidak boleh dilempar mentah dari query string ke TypeORM:
 * kolom yang tidak dikenal membuat query SQL gagal, dan whitelist juga
 * menutup kolom yang memang tidak boleh bisa diurutkan (mis. token).
 *
 * Nama param `sort` dan `order` mengikuti PaginationQuery pada package
 * shared, bukan nama baru.
 *
 * @param sort      nama properti entity dari query, opsional
 * @param allowed   whitelist properti yang boleh diurutkan
 * @param defaultField properti yang dipakai bila sort tidak diisi
 * @param order     'ASC' atau 'DESC'; nilai selain itu dianggap DESC
 * @throws BadRequestException bila sort tidak ada di whitelist
 */
export function resolveOrder(
  sort: string | undefined,
  allowed: readonly string[],
  defaultField: string,
  order?: string,
): Record<string, SortOrder> {
  const direction: SortOrder = order === 'ASC' ? 'ASC' : 'DESC';

  if (!sort) {
    return { [defaultField]: direction };
  }

  if (!allowed.includes(sort)) {
    throw new BadRequestException(
      `Cannot sort by "${sort}". Allowed fields: ${allowed.join(', ')}`,
    );
  }

  return { [sort]: direction };
}
