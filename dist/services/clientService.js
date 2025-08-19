"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countClientsWithProfiles = countClientsWithProfiles;
exports.getClientProfileByUserId = getClientProfileByUserId;
exports.updateClientProfileByUserId = updateClientProfileByUserId;
exports.deleteClientProfileByUserId = deleteClientProfileByUserId;
exports.listClientsWithProfiles = listClientsWithProfiles;
exports.getClientById = getClientById;
// Conta o total de clientes com perfil, aplicando os mesmos filtros
async function countClientsWithProfiles(filter = {}) {
    const { industry, companySize, location } = filter;
    const whereClause = {
        ...(industry && { industry: { contains: industry, mode: "insensitive" } }),
        ...(companySize && { companySize }),
        ...(location && { address: { path: ["city"], equals: location } }), // Ajuste se o campo location estiver em address
    };
    return prisma_1.prisma.client.count({ where: whereClause });
}
const prisma_1 = require("../config/prisma");
async function getClientProfileByUserId(userId) {
    return prisma_1.prisma.client.findUnique({
        where: { userId },
        include: {
            user: true,
            favoriteEquipments: { include: { equipment: true } },
            notifications: true,
            bookings: true,
        },
    });
}
async function updateClientProfileByUserId(userId, data) {
    return prisma_1.prisma.client.update({
        where: { userId },
        data,
        include: {
            user: true,
            favoriteEquipments: { include: { equipment: true } },
            notifications: true,
            bookings: true,
        },
    });
}
async function deleteClientProfileByUserId(userId) {
    return prisma_1.prisma.client.delete({ where: { userId } });
}
async function listClientsWithProfiles(filter = {}) {
    // Filtros opcionais: industry, companySize, location, paginação
    const { industry, companySize, location, page = 1, pageSize = 20 } = filter;
    const whereClause = {
        ...(industry && { industry: { contains: industry, mode: "insensitive" } }),
        ...(companySize && { companySize }),
        ...(location && { address: { path: ["city"], equals: location } }), // Ajuste se o campo location estiver em address
    };
    const skip = (page - 1) * pageSize;
    const clients = await prisma_1.prisma.client.findMany({
        where: whereClause,
        include: {
            user: true,
            favoriteEquipments: { include: { equipment: true } },
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
async function getClientById(clientId) {
    // Busca o cliente na tabela client e inclui o usuário relacionado
    return prisma_1.prisma.client.findUnique({
        where: { id: clientId },
        include: {
            user: true,
            favoriteEquipments: { include: { equipment: true } },
            notifications: true,
            bookings: true,
        },
    });
}
