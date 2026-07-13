import crypto from "crypto";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import logger from "../config/logger";
import { NotFoundError } from "../utils/errors";

/**
 * LGPD (Lei Geral de Proteção de Dados) — exportação e exclusão reais dos dados do
 * titular. Antes desta implementação, a página de LGPD só dizia "mande um email para
 * exercer seus direitos" — não havia nenhum mecanismo de autoatendimento.
 */

export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bio: true,
      location: true,
      website: true,
      verified: true,
      isVip: true,
      createdAt: true,
      avatarUrl: true,
      socialProvider: true,
      googleCalendarEmail: true,
      clientProfile: {
        select: {
          phone: true,
          companyName: true,
          industry: true,
          address: true,
          jobTitle: true,
          department: true,
          preferredCategories: true,
          eventTypes: true,
          totalBookings: true,
          totalSpent: true,
          createdAt: true,
        },
      },
      collaboratorProfile: {
        select: {
          phone: true,
          collaboratorRole: true,
          specialties: true,
          status: true,
          experience: true,
          totalEvents: true,
          totalEarnings: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError("Usuário não encontrado");

  const [bookings, reviews] = await Promise.all([
    prisma.booking.findMany({
      where: { client: { userId } },
      select: {
        id: true,
        eventTitle: true,
        eventDate: true,
        status: true,
        totalPrice: true,
        location: true,
        street: true,
        neighborhood: true,
        city: true,
        state: true,
        zipCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.findMany({
      where: { reviewerId: userId },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: user,
    bookings,
    reviews,
  };
}

/**
 * Direito ao esquecimento (LGPD art. 18, V): apaga os dados diretamente identificáveis
 * do titular. Não usa DELETE físico — reservas/avaliações permanecem para registro
 * financeiro/histórico (mesma decisão já tomada para o soft-delete geral de usuário, ver
 * Fase 2.8a), mas todo campo de identificação direta é substituído por um valor anônimo.
 */
export async function eraseUserData(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("Usuário não encontrado");

  const anonymizedEmail = `usuario-removido-${userId}@dados-removidos.xproducoeseeventos.com.br`;
  const unusablePasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: "Usuário removido",
      email: anonymizedEmail,
      passwordHash: unusablePasswordHash,
      avatarUrl: null,
      bio: null,
      location: null,
      website: null,
      socialLinks: Prisma.JsonNull,
      profileSettings: Prisma.JsonNull,
      isActive: false,
      googleCalendarEmail: null,
      googleRefreshToken: null,
      googleResourceId: null,
      socialProvider: null,
      socialProviderId: null,
    },
  });

  // Perfil de cliente: mantém o histórico de reservas (totalBookings/totalSpent), mas
  // remove os dados de contato diretos.
  await prisma.client.updateMany({
    where: { userId },
    data: {
      phone: null,
      companyName: null,
      industry: null,
      jobTitle: null,
      department: null,
      address: Prisma.JsonNull,
    },
  });

  // Perfil de colaborador: mesma lógica — mantém histórico de eventos/ganhos, remove contato.
  await prisma.collaborator.updateMany({
    where: { userId },
    data: {
      phone: null,
      portfolio: Prisma.JsonNull,
    },
  });

  // Reservas: clientName/clientContact/clientEmail são um snapshot direto gravado na
  // criação da reserva (bookingService.ts), independente da relação com Client/User —
  // existem para reservas de clientes não cadastrados. Sem isso, o nome/contato/e-mail do
  // titular continuava em texto puro em todo o histórico de reservas mesmo depois da
  // anonimização acima, que só atinge User/Client/Collaborator. mantém totalPrice/
  // eventDate/status etc. (mesmo espírito de retenção financeira já aplicado ao restante
  // desta função) — só os campos de identificação direta são limpos.
  await prisma.booking.updateMany({
    where: { client: { userId } },
    data: {
      clientName: "Cliente removido",
      clientContact: null,
      clientEmail: null,
    },
  });

  logger.info({ userId }, "Dados pessoais do usuário anonimizados (solicitação LGPD)");

  return { success: true };
}

/**
 * Localiza a conta local a partir do ID de usuário de um provedor social (ex.: o
 * `user_id` do signed_request de exclusão de dados da Meta/Facebook) e executa a mesma
 * anonimização real usada pelo fluxo de autoatendimento.
 *
 * Retorna null quando não há conta local mapeada (conta nunca existiu, ou o mapeamento
 * ainda não foi populado — só passou a ser gravado a partir desta correção, em login
 * social novo ou já existente via oauthService.ts).
 */
export async function eraseUserDataBySocialId(
  provider: "facebook" | "google",
  providerUserId: string,
): Promise<{ userId: string } | null> {
  const user = await prisma.user.findFirst({
    where: { socialProvider: provider, socialProviderId: providerUserId },
    select: { id: true },
  });

  if (!user) return null;

  await eraseUserData(user.id);
  return { userId: user.id };
}
