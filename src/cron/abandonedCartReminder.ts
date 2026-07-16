import cron from 'node-cron';
import { prisma } from '../config/prisma';
import logger from '../config/logger';
import { queueEmail } from '../config/jobQueue';
import { cacheService } from '../services/cacheService';

// Achado (auditoria de produto): não existia nenhum mecanismo de recuperação de orçamento
// abandonado. "Carrinho" é literalmente um Booking com status DRAFT (ver
// cartRepository.ts) — só existe no banco para quem estava autenticado ao adicionar
// itens (o carrinho de convidado, adicionado nesta mesma sessão, vive só no localStorage
// até o envio, então não há o que recuperar server-side para quem nunca chegou a logar).
const LOCK_KEY = 'abandoned-cart-reminder';
const LOCK_TTL_SECONDS = 10 * 60;
const ABANDONED_AFTER_HOURS = 24;
// TTL alto só para não reenviar o mesmo lembrete indefinidamente a cada ciclo do cron —
// não é uma trava de negócio, é só controle de "já mandei esse aviso recentemente".
const SENT_FLAG_TTL_SECONDS = 30 * 24 * 60 * 60;

export const startAbandonedCartReminderScheduler = () => {
  if (process.env.ENABLE_CRON_JOBS !== 'true') {
    logger.info('[AbandonedCartReminder] Disabled (ENABLE_CRON_JOBS !== true). Skipping to save Neon DB compute hours.');
    return;
  }
  logger.info('[AbandonedCartReminder] Starting scheduler (0 */6 * * *)...');

  // A cada 6 horas
  cron.schedule('0 */6 * * *', async () => {
    const acquired = await cacheService.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
    if (!acquired) {
      logger.info('[AbandonedCartReminder] Outra instância já está processando este ciclo. Pulando.');
      return;
    }

    const cutoff = new Date(Date.now() - ABANDONED_AFTER_HOURS * 60 * 60 * 1000);

    try {
      const draftCarts = await prisma.booking.findMany({
        where: {
          status: 'DRAFT',
          updatedAt: { lte: cutoff },
          OR: [
            { equipments: { some: {} } },
            { kitId: { not: null } },
            { services: { some: {} } },
          ],
        },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          equipments: { select: { name: true } },
          kit: { select: { name: true } },
        },
        take: 100, // proteção contra picos — próximo ciclo pega o resto
      });

      if (draftCarts.length === 0) {
        logger.info('[AbandonedCartReminder] Nenhum carrinho abandonado encontrado.');
        return;
      }

      logger.info({ count: draftCarts.length }, '[AbandonedCartReminder] Carrinhos abandonados encontrados');

      for (const cart of draftCarts) {
        if (!cart.creator?.email) continue;

        const alreadySent = await cacheService.get<boolean>(`abandoned-cart-sent:${cart.id}`);
        if (alreadySent) continue;

        const itemNames = [
          ...(cart.kit ? [cart.kit.name] : []),
          ...cart.equipments.map((e) => e.name),
        ].filter((name): name is string => !!name);

        try {
          await queueEmail({
            type: 'notification',
            to: cart.creator.email,
            templateData: {
              subject: 'Você deixou itens no seu orçamento — X Produções',
              message: `<h1>Olá, ${cart.creator.name}!</h1><p>Notamos que você começou um orçamento${itemNames.length ? ` com ${itemNames.join(', ')}` : ''} mas não finalizou o envio.</p><p>Seus itens continuam salvos — complete seu orçamento a qualquer momento acessando <a href="${process.env.FRONTEND_URL}/carrinho">${process.env.FRONTEND_URL}/carrinho</a>.</p>`,
            },
          });
          await cacheService.set(`abandoned-cart-sent:${cart.id}`, true, SENT_FLAG_TTL_SECONDS);
          logger.info({ bookingId: cart.id, email: cart.creator.email }, '[AbandonedCartReminder] Lembrete enviado com sucesso');
        } catch (e) {
          logger.warn({ err: e, bookingId: cart.id }, '[AbandonedCartReminder] Falha ao enviar lembrete (não bloqueante)');
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: msg }, '[AbandonedCartReminder] Job failed');
    } finally {
      await cacheService.releaseLock(LOCK_KEY);
    }
  });
};
