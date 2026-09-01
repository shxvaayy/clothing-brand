import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import type { InventoryReason } from "@/generated/prisma/enums";

type Tx = Prisma.TransactionClient;

/**
 * Atomically adjust a variant's stock. Uses a row lock so concurrent
 * adjustments never lose updates or oversell.
 */
export async function adjustStock(params: {
  variantId: string;
  delta?: number; // relative change
  setTo?: number; // absolute value (wins over delta)
  reason: InventoryReason;
  actor?: string;
  note?: string;
  orderId?: string;
  tx?: Tx;
}) {
  const run = async (tx: Tx) => {
    const rows = await tx.$queryRaw<{ id: string; stock: number }[]>`
      SELECT id, stock FROM "ProductVariant" WHERE id = ${params.variantId} FOR UPDATE`;
    if (rows.length === 0) throw new Error("Variant not found");
    const previous = rows[0].stock;
    const next =
      params.setTo !== undefined
        ? Math.max(0, params.setTo)
        : Math.max(0, previous + (params.delta ?? 0));
    await tx.productVariant.update({
      where: { id: params.variantId },
      data: { stock: next },
    });
    await tx.inventoryTransaction.create({
      data: {
        variantId: params.variantId,
        delta: next - previous,
        previous,
        next,
        reason: params.reason,
        actor: params.actor ?? "system",
        note: params.note,
        orderId: params.orderId,
      },
    });
    return { previous, next };
  };
  if (params.tx) return run(params.tx);
  return db.$transaction(run);
}

/**
 * Reserve stock for an order being paid. Fails if available (stock - reserved)
 * is insufficient. Must be called inside a transaction.
 */
export async function reserveStock(
  tx: Tx,
  variantId: string,
  quantity: number
): Promise<{ ok: true } | { ok: false; available: number }> {
  const rows = await tx.$queryRaw<
    { stock: number; reservedStock: number }[]
  >`SELECT stock, "reservedStock" FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE`;
  if (rows.length === 0) return { ok: false, available: 0 };
  const available = rows[0].stock - rows[0].reservedStock;
  if (available < quantity) return { ok: false, available };
  await tx.productVariant.update({
    where: { id: variantId },
    data: { reservedStock: { increment: quantity } },
  });
  return { ok: true };
}

/** Convert a reservation into a sale (payment confirmed). */
export async function commitReservation(
  tx: Tx,
  variantId: string,
  quantity: number,
  orderId: string
) {
  const rows = await tx.$queryRaw<{ stock: number; reservedStock: number }[]>`
    SELECT stock, "reservedStock" FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE`;
  if (rows.length === 0) return;
  const previous = rows[0].stock;
  const next = Math.max(0, previous - quantity);
  await tx.productVariant.update({
    where: { id: variantId },
    data: {
      stock: next,
      reservedStock: { decrement: Math.min(quantity, rows[0].reservedStock) },
    },
  });
  await tx.inventoryTransaction.create({
    data: {
      variantId,
      delta: next - previous,
      previous,
      next,
      reason: "SALE",
      actor: "system",
      orderId,
    },
  });
}

/** Release a reservation (payment failed / expired / cancelled before pay). */
export async function releaseReservation(
  tx: Tx,
  variantId: string,
  quantity: number
) {
  const rows = await tx.$queryRaw<{ reservedStock: number }[]>`
    SELECT "reservedStock" FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE`;
  if (rows.length === 0) return;
  await tx.productVariant.update({
    where: { id: variantId },
    data: { reservedStock: { decrement: Math.min(quantity, rows[0].reservedStock) } },
  });
}

/** Restore sold stock (cancellation of a paid order / accepted return). */
export async function restoreStock(
  tx: Tx,
  variantId: string,
  quantity: number,
  reason: InventoryReason,
  orderId: string,
  actor: string
) {
  const rows = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE`;
  if (rows.length === 0) return;
  const previous = rows[0].stock;
  const next = previous + quantity;
  await tx.productVariant.update({
    where: { id: variantId },
    data: { stock: next },
  });
  await tx.inventoryTransaction.create({
    data: { variantId, delta: quantity, previous, next, reason, actor, orderId },
  });
}

/**
 * Release reservations of expired unpaid orders so abandoned checkouts
 * never hold stock forever. Called opportunistically before availability reads.
 */
export async function releaseExpiredReservations() {
  const expired = await db.order.findMany({
    where: {
      status: "PAYMENT_PENDING",
      reservationExpiresAt: { lt: new Date() },
    },
    include: { items: true },
    take: 20,
  });
  for (const order of expired) {
    await db.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.variantId) await releaseReservation(tx, item.variantId, item.quantity);
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", reservationExpiresAt: null },
      });
      await tx.orderEvent.create({
        data: { orderId: order.id, status: "CANCELLED", note: "Payment window expired" },
      });
    });
  }
}

export type StockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function availableOf(v: { stock: number; reservedStock: number }) {
  return Math.max(0, v.stock - v.reservedStock);
}

export function stockState(available: number, threshold: number): StockState {
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= threshold) return "LOW_STOCK";
  return "IN_STOCK";
}
