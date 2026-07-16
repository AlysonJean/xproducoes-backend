// backend/src/services/couponService.ts
//
// Achado (auditoria de produto): plataformas de referência (Shopify, iFood, etc.) usam
// cupons de desconto como ferramenta padrão de aquisição/retenção (ex.: "10% OFF primeira
// locação"); a X Produções não tinha nenhum mecanismo de desconto — só o campo livre
// `discount` por item do orçamento, preenchido manualmente pelo admin, sem código, sem
// regras, sem limite de uso. Modelo `Coupon` novo (ver prisma/schema.prisma).
import { CouponDiscountType, BookingStatus, Coupon } from "@prisma/client";
import { prisma } from "../config/prisma";
import { BadRequestError, NotFoundError } from "../utils/errors";

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  maxUsesPerClient?: number;
  validFrom?: string | Date;
  validUntil?: string | Date;
  active?: boolean;
}

export type UpdateCouponInput = Partial<CreateCouponInput>;

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  coupon?: Coupon;
  discountAmount?: number;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

// Um "uso" é 1:1 com um Booking que referencia o cupom — evita precisar de uma tabela de
// resgates separada só para contar (Booking já é o registro de uso).
async function countUsage(couponId: string, creatorId?: string): Promise<number> {
  return prisma.booking.count({
    where: {
      couponId,
      status: { not: BookingStatus.CANCELLED },
      ...(creatorId ? { creatorId } : {}),
    },
  });
}

function computeDiscount(coupon: Coupon, subtotal: number): number {
  let discount =
    coupon.discountType === CouponDiscountType.PERCENTAGE
      ? subtotal * (Number(coupon.discountValue) / 100)
      : Number(coupon.discountValue);

  if (coupon.maxDiscountAmount != null) {
    discount = Math.min(discount, Number(coupon.maxDiscountAmount));
  }
  // Nunca desconta mais que o próprio valor do pedido.
  discount = Math.min(discount, subtotal);
  return Math.max(0, Math.round(discount * 100) / 100);
}

export async function validateCoupon(
  code: string,
  { subtotal, userId }: { subtotal: number; userId?: string }
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: normalizeCode(code) } });

  if (!coupon) return { valid: false, reason: "Cupom não encontrado." };
  if (!coupon.active) return { valid: false, reason: "Este cupom não está mais ativo." };

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    return { valid: false, reason: "Este cupom ainda não é válido." };
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return { valid: false, reason: "Este cupom expirou." };
  }
  if (coupon.minOrderValue != null && subtotal < Number(coupon.minOrderValue)) {
    return {
      valid: false,
      reason: `Este cupom exige um pedido mínimo de R$ ${Number(coupon.minOrderValue).toFixed(2)}.`,
    };
  }

  if (coupon.maxUses != null) {
    const totalUses = await countUsage(coupon.id);
    if (totalUses >= coupon.maxUses) {
      return { valid: false, reason: "Este cupom atingiu o limite de usos." };
    }
  }

  if (userId && coupon.maxUsesPerClient != null) {
    const userUses = await countUsage(coupon.id, userId);
    if (userUses >= coupon.maxUsesPerClient) {
      return { valid: false, reason: "Você já utilizou este cupom o número máximo de vezes." };
    }
  }

  return { valid: true, coupon, discountAmount: computeDiscount(coupon, subtotal) };
}

export async function listCoupons() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const usageCounts = await Promise.all(coupons.map((c) => countUsage(c.id)));
  return coupons.map((c, i) => ({ ...c, usedCount: usageCounts[i] }));
}

export async function getCouponById(id: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new NotFoundError("Cupom não encontrado.");
  return { ...coupon, usedCount: await countUsage(coupon.id) };
}

export async function createCoupon(input: CreateCouponInput) {
  const code = normalizeCode(input.code);
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw new BadRequestError("Já existe um cupom com este código.");

  return prisma.coupon.create({
    data: {
      code,
      description: input.description,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderValue: input.minOrderValue,
      maxDiscountAmount: input.maxDiscountAmount,
      maxUses: input.maxUses,
      maxUsesPerClient: input.maxUsesPerClient,
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      active: input.active ?? true,
    },
  });
}

export async function updateCoupon(id: string, input: UpdateCouponInput) {
  await getCouponById(id);

  if (input.code) {
    const normalized = normalizeCode(input.code);
    const existing = await prisma.coupon.findUnique({ where: { code: normalized } });
    if (existing && existing.id !== id) {
      throw new BadRequestError("Já existe um cupom com este código.");
    }
  }

  return prisma.coupon.update({
    where: { id },
    data: {
      code: input.code ? normalizeCode(input.code) : undefined,
      description: input.description,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderValue: input.minOrderValue,
      maxDiscountAmount: input.maxDiscountAmount,
      maxUses: input.maxUses,
      maxUsesPerClient: input.maxUsesPerClient,
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      active: input.active,
    },
  });
}

export async function deleteCoupon(id: string): Promise<void> {
  await getCouponById(id);
  await prisma.coupon.delete({ where: { id } });
}
