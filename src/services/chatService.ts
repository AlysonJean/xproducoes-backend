// backend/src/services/chatService.ts
//
// Achado (auditoria de produto): o chat operacional do evento (Chat{type:'EVENT'}) só
// adicionava o criador da reserva como participante quando ele era ADMIN/MANAGER (reservas
// criadas manualmente pela equipe) — o cliente comum, dono real do evento, nunca entrava no
// próprio chat. Extraído de bookingStatusService.syncEventChat para ser reutilizável também
// por um endpoint sob demanda (cliente inicia a conversa antes mesmo da confirmação).
import { prisma } from "../config/prisma";
import logger from "../config/logger";

export async function getOrCreateEventChat(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      eventCollaborators: { include: { collaborator: true } },
      creator: true,
    },
  });

  if (!booking) return null;

  let chat = await prisma.chat.findFirst({ where: { bookingId, type: "EVENT" } });

  const participantIds = new Set<string>();
  // O cliente que criou a reserva sempre participa do chat do próprio evento.
  participantIds.add(booking.creatorId);
  booking.eventCollaborators.forEach((ec) => participantIds.add(ec.collaborator.userId));

  // Garante que sempre haja alguém da equipe disponível no chat, mesmo antes de colaboradores
  // serem alocados ao evento (mesmo padrão já usado em createSupportChat).
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  admins.forEach((a) => participantIds.add(a.id));

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        name: `Evento: ${booking.eventTitle || booking.id}`,
        type: "EVENT",
        bookingId,
        participants: {
          create: Array.from(participantIds).map((userId) => ({ userId })),
        },
      },
    });
    logger.info(`Chat de evento criado: ${chat.id}`);
  } else {
    for (const userId of participantIds) {
      await prisma.chatParticipant.upsert({
        where: { chatId_userId: { chatId: chat.id, userId } },
        create: { chatId: chat.id, userId },
        update: {},
      });
    }
  }

  return prisma.chat.findUnique({
    where: { id: chat.id },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });
}
