import { prisma } from '../../config/prisma.js';
import { AppError } from '../../common/errors/AppError.js';

type AdjustType = 'RESTOCK' | 'DAMAGE' | 'CORRECTION' | 'MANUAL_ADJUSTMENT';

/**
 * Adjust variant stock and record an inventory movement, atomically.
 * `quantity` is signed: positive adds stock, negative removes it. Stock can
 * never be driven below zero.
 */
export async function adjustInventory(input: {
  variantId: string;
  quantity: number;
  type: AdjustType;
  reason?: string;
  adminId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({ where: { id: input.variantId } });
    if (!variant) throw AppError.notFound('Variant not found');

    const newStock = variant.stock + input.quantity;
    if (newStock < 0) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', 'Adjustment would make stock negative');
    }

    await tx.productVariant.update({
      where: { id: input.variantId },
      data: { stock: newStock },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        variantId: input.variantId,
        type: input.type,
        reason: input.reason ?? null,
        quantity: input.quantity,
        previousStock: variant.stock,
        newStock,
        adminId: input.adminId ?? null,
      },
    });

    return { variantId: input.variantId, previousStock: variant.stock, newStock, movementId: movement.id };
  });
}
