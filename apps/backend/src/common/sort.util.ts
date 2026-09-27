import { BadRequestException } from '@nestjs/common';

export type SortOrder = 'ASC' | 'DESC';

/**
 * Susun opsi ORDER BY TypeORM dari parameter query user secara aman.
 *
 * Nama kolom tidak boleh dilempar mentah dari query string ke TypeORM:
 * kolom yang tidak dikenal membuat query SQL gagal, dan whitelist juga
 * menutup kolom yang memang tidak boleh bisa diurutkan (mis. token).
 *
 * @param sortBy    nama properti entity dari query, opsional
 * @param allowed   whitelist properti yang boleh diurutkan
 * @param defaultField properti yang dipakai bila sortBy tidak diisi
 * @param sortOrder 'ASC' atau 'DESC'; nilai selain itu dianggap DESC
 * @throws BadRequestException bila sortBy tidak ada di whitelist
 */
export function resolveOrder(
  sortBy: string | undefined,
  allowed: readonly string[],
  defaultField: string,
  sortOrder?: string,
): Record<string, SortOrder> {
  const order: SortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  if (!sortBy) {
    return { [defaultField]: order };
  }

  if (!allowed.includes(sortBy)) {
    throw new BadRequestException(
      `Cannot sort by "${sortBy}". Allowed fields: ${allowed.join(', ')}`,
    );
  }

  return { [sortBy]: order };
}
