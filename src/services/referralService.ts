// backend/src/services/referralService.ts
//
// Achado (produto): negócio pediu uma forma de trazer clientes novos via indicação de
// clientes existentes — o sistema de Coupon (ver couponService.ts) já resolve a parte de
// "código de desconto com regras", então o programa de indicação é construído por cima
// dele em vez de duplicar lógica: o código pessoal de cada cliente É um Coupon normal
// (compartilhável, sem dono restrito), e a recompensa por indicação bem-sucedida é OUTRO
// Coupon, gerado sob demanda, restrito a um único usuário (o indicador).
import { CouponDiscountType, Coupon } from "@prisma/client";
import { prisma } from "../config/prisma";
import { createNotification } from "./notificationService";
import { whatsappService } from "./whatsappService";
import logger from "../config/logger";

const REFERRAL_DISCOUNT_PERCENT = 10;
const REFERRAL_MAX_DISCOUNT = 150; // R$ — protege contra orçamentos muito altos
const REWARD_DISCOUNT_PERCENT = 10;
const REWARD_MAX_DISCOUNT = 150;
const REWARD_VALIDITY_DAYS = 90;

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function randomSuffix(length = 4): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1 (evita confusão visual)
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function baseCodeFromName(name: string): string {
  const firstName = name.trim().split(/\s+/)[0] || "AMIGO";
  const cleaned = stripDiacritics(firstName).replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (cleaned || "AMIGO").slice(0, 8);
}

async function generateUniqueCode(name: string): Promise<string> {
  const base = baseCodeFromName(name);
  // Poucas tentativas bastam: espaço de sufixo (32^4 ≈ 1M combinações) torna colisão rara.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${base}${randomSuffix()}`;
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (!existing) return code;
  }
  // Fallback extremamente improvável: sufixo maior.
  return `${base}${randomSuffix(6)}`;
}

/**
 * Retorna o cupom de indicação pessoal do cliente, criando um na primeira vez que for
 * pedido (lazy — não gera código para clientes que nunca acessam a própria página de
 * indicação).
 */
export async function getOrCreateReferralCoupon(clientId: string): Promise<Coupon> {
  const existing = await prisma.coupon.findUnique({ where: { referrerClientId: clientId } });
  if (existing) return existing;

  const client = await prisma.client.findUnique({ where: { id: clientId }, include: { user: true } });
  if (!client) throw new Error("Cliente não encontrado.");

  const code = await generateUniqueCode(client.user.name);

  return prisma.coupon.create({
    data: {
      code,
      description: `Código de indicação de ${client.user.name}`,
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: REFERRAL_DISCOUNT_PERCENT,
      maxDiscountAmount: REFERRAL_MAX_DISCOUNT,
      maxUsesPerClient: 1, // cada amigo só usa uma vez — não vira desconto recorrente
      active: true,
      referrerClientId: clientId,
    },
  });
}

export interface ReferralStats {
  code: string;
  discountPercent: number;
  timesUsed: number;
  rewardsEarned: number;
}

export async function getReferralStats(clientId: string): Promise<ReferralStats> {
  const coupon = await getOrCreateReferralCoupon(clientId);

  const timesUsed = await prisma.booking.count({
    where: { couponId: coupon.id, status: { not: "CANCELLED" } },
  });

  const rewardsEarned = await prisma.booking.count({
    where: { couponId: coupon.id, referralRewardIssuedAt: { not: null } },
  });

  return {
    code: coupon.code,
    discountPercent: Number(coupon.discountValue),
    timesUsed,
    rewardsEarned,
  };
}

/**
 * Chamado quando uma reserva é marcada como CONCLUÍDA (ver bookingStatusService). Se essa
 * reserva usou o código de indicação de alguém, emite a recompensa pro indicador — só na
 * conclusão (não na confirmação), pra não recompensar reservas que acabam sendo canceladas.
 */
export async function issueReferralRewardIfApplicable(booking: {
  id: string;
  couponId: string | null;
  referralRewardIssuedAt: Date | null;
}): Promise<void> {
  if (!booking.couponId || booking.referralRewardIssuedAt) return;

  const coupon = await prisma.coupon.findUnique({ where: { id: booking.couponId } });
  if (!coupon?.referrerClientId) return; // não é um código de indicação, é um cupom comum

  const referrer = await prisma.client.findUnique({
    where: { id: coupon.referrerClientId },
    include: { user: true },
  });
  if (!referrer) return;

  try {
    const rewardCode = `INDIC${randomSuffix(6)}`;
    const validUntil = new Date(Date.now() + REWARD_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.coupon.create({
      data: {
        code: rewardCode,
        description: `Recompensa de indicação para ${referrer.user.name}`,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: REWARD_DISCOUNT_PERCENT,
        maxDiscountAmount: REWARD_MAX_DISCOUNT,
        maxUses: 1,
        validUntil,
        active: true,
        restrictedToUserId: referrer.userId,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { referralRewardIssuedAt: new Date() },
    });

    void createNotification({
      userId: referrer.userId,
      type: "REFERRAL_REWARD",
      title: "Você ganhou uma recompensa! 🎉",
      message: `Um amigo que você indicou concluiu a locação. Use o código ${rewardCode} pra ganhar ${REWARD_DISCOUNT_PERCENT}% de desconto na sua próxima reserva.`,
      actionUrl: "/cliente/painel",
    });

    if (referrer.phone) {
      void whatsappService
        .sendMessage(
          referrer.phone,
          `🎉 *Você ganhou uma recompensa!*\n\nUm amigo que você indicou pra X Produções concluiu a locação dele.\n\nUse o código *${rewardCode}* pra ganhar ${REWARD_DISCOUNT_PERCENT}% de desconto (até R$ ${REWARD_MAX_DISCOUNT}) na sua próxima reserva. Válido por ${REWARD_VALIDITY_DAYS} dias.`
        )
        .catch((e: unknown) => logger.warn({ error: e }, "Erro ao enviar WhatsApp de recompensa de indicação"));
    }
  } catch (error) {
    logger.error({ error }, "Erro ao emitir recompensa de indicação");
  }
}
