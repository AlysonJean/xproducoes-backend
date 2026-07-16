// backend/src/services/notificationService.ts
//
// Achado (auditoria de produto): o modelo Notification e as rotas de leitura
// (GET /dashboard/notifications, GET /collaborators/me/notifications) já existiam, mas
// nenhum lugar do sistema jamais chamava `.notification.create(` — a tabela ficava
// permanentemente vazia, e o sino/badge de notificação sempre aparecia "sem notificações"
// mesmo quando eventos relevantes (novo orçamento, reserva confirmada) claramente
// aconteciam. Este service é a peça que faltava; não bloqueante (falha só loga).
import { prisma } from "../config/prisma";
import { NotificationType, UserRole, Prisma } from "@prisma/client";
import logger from "../config/logger";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  important?: boolean;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    return await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        important: input.important ?? false,
      },
    });
  } catch (e) {
    logger.warn({ err: e }, "Falha ao criar notificação (não bloqueante)");
    return null;
  }
}

/** Notifica todos os admins — usado para eventos que a equipe precisa ver (novo orçamento). */
export async function notifyAdmins(input: Omit<CreateNotificationInput, "userId">) {
  try {
    const admins = await prisma.user.findMany({ where: { role: UserRole.ADMIN }, select: { id: true } });
    await Promise.all(admins.map((admin) => createNotification({ ...input, userId: admin.id })));
  } catch (e) {
    logger.warn({ err: e }, "Falha ao notificar admins (não bloqueante)");
  }
}
