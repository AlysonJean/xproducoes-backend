import { prisma } from "../config/prisma";
import type { Prisma } from "@prisma/client";

interface ClientListFilter {
  industry?: string;
  companySize?: string;
  location?: string;
  page?: number;
  pageSize?: number;
}

// Conta o total de clientes com perfil, aplicando os mesmos filtros
export async function countClientsWithProfiles(filter: ClientListFilter = {}) {
  const { industry, companySize, location } = filter;
  const whereClause: Prisma.ClientWhereInput = {
    ...(industry && { industry: { contains: industry, mode: "insensitive" } }),
    ...(companySize && { companySize }),
    ...(location && { address: { path: ["city"], equals: location } }), // Ajuste se o campo location estiver em address
  };
  return prisma.client.count({ where: whereClause });
}

export async function getClientProfileByUserId(userId: string) {
  return prisma.client.findUnique({
    where: { userId },
    include: {
      user: true,
      favorites: { include: { equipment: true, kit: true, service: true } },
      notifications: true,
      bookings: true,
    },
  });
}

export async function updateClientProfileByUserId(userId: string, data: Prisma.ClientUpdateInput) {
  return prisma.client.update({
    where: { userId },
    data,
    include: {
      user: true,
      favorites: { include: { equipment: true, kit: true, service: true } },
      notifications: true,
      bookings: true,
    },
  });
}

export async function deleteClientProfileByUserId(userId: string) {
  return prisma.client.delete({ where: { userId } });
}

export async function listClientsWithProfiles(filter: ClientListFilter = {}) {
  // Filtros opcionais: industry, companySize, location, paginação
  const { industry, companySize, location, page = 1, pageSize = 20 } = filter;
  const whereClause: Prisma.ClientWhereInput = {
    ...(industry && { industry: { contains: industry, mode: "insensitive" } }),
    ...(companySize && { companySize }),
    ...(location && { address: { path: ["city"], equals: location } }), // Ajuste se o campo location estiver em address
  };
  const skip = (page - 1) * pageSize;
  const clients = await prisma.client.findMany({
    where: whereClause,
    include: {
      user: true,
      favorites: { include: { equipment: true, kit: true, service: true } },
      notifications: true,
      bookings: true,
    },
    orderBy: { totalBookings: "desc" },
    skip,
    take: pageSize,
  });

  // Mapeia os campos do client e do usuário relacionado
  return clients.map((client) => {
    const user = client.user;
    return {
      id: client.id,
      userId: client.userId,
      name: user?.name ?? undefined,
      email: user?.email ?? undefined,
      role: user?.role ?? undefined,
      bio: user?.bio ?? undefined,
      location: user?.location ?? undefined,
      phone: client.phone ?? undefined,
      avatar: user?.avatarUrl ?? undefined,
      isActive: user?.isActive ?? undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      status: user?.isActive === false ? 'INACTIVE' : 'ACTIVE',
      totalBookings: client.totalBookings ?? 0,
      totalSpent: client.totalSpent ?? 0,
      companyName: client.companyName,
      industry: client.industry,
      companySize: client.companySize,
      address: client.address,
      jobTitle: client.jobTitle,
      department: client.department,
      budget: client.budget,
      preferredCategories: client.preferredCategories,
      eventTypes: client.eventTypes,
      communicationPrefs: client.communicationPrefs,
      // Adicione outros campos do client se necessário
    };
  });
}

export async function getClientById(clientId: string) {
  // Busca o cliente na tabela client e inclui o usuário relacionado
  return prisma.client.findUnique({
    where: { id: clientId },
    include: {
      user: true,
      favorites: { include: { equipment: true, kit: true, service: true } },
      notifications: true,
      bookings: true,
    },
  });
}
