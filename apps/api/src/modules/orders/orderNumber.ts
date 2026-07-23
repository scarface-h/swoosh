import { customAlphabet } from 'nanoid';

// Unambiguous alphabet (no 0/O/1/I) for human-readable, unique order numbers.
const nano = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);

/**
 * Generate a unique, non-sequential order number, e.g. "SW-260723-8F3KQ7AB".
 * The random suffix makes order numbers unguessable and decoupled from DB IDs.
 */
export function generateOrderNumber(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `SW-${yy}${mm}${dd}-${nano()}`;
}
