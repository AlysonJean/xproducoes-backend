/**
 * 📦 EQUIPMENT REPOSITORY
 * Camada de acesso a dados para equipamentos
 */

import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

// Tipos
export interface EquipmentFilters {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
  condition?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SortOptions {
  field: 'name' | 'pricePerHour' | 'createdAt';
  order: 'asc' | 'desc';
}

// Select padrão para listagem
const equipmentSelect = {
  id: true,
  name: true,
  description: true,
  pricePerHour: true,
  imageUrl: true,
  quantity: true,
  isAvailable: true,
  condition: true,
  tags: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

// Select completo para detalhes
const equipmentSelectFull = {
  ...equipmentSelect,
  specifications: true,
  weight: true,
  dimensions: true,
  powerRequirements: true,
  maintenanceNotes: true,
  maintenanceDate: true,
  purchaseDate: true,
  warrantyExpiration: true,
  serialNumber: true,
  location: true,
  minimumRentalDuration: true,
  replacementCost: true,
} as const;

/**
 * Buscar equipamento por ID
 */
export async function findById(id: string) {
  return prisma.equipment.findUnique({
    where: { id },
    select: equipmentSelectFull,
  });
}

/**
 * Listar equipamentos com filtros e paginação
 */
export async function findMany(
  filters: EquipmentFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 20 },
  sort: SortOptions = { field: 'createdAt', order: 'desc' }
) {
  const { search, categoryId, minPrice, maxPrice, isAvailable, condition } = filters;
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.EquipmentWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (minPrice !== undefined) {
    where.pricePerHour = { ...where.pricePerHour as object, gte: minPrice };
  }

  if (maxPrice !== undefined) {
    where.pricePerHour = { ...where.pricePerHour as object, lte: maxPrice };
  }

  if (isAvailable !== undefined) {
    where.isAvailable = isAvailable;
  }

  if (condition) {
    where.condition = condition;
  }

  // Ordenação
  const orderBy: Prisma.EquipmentOrderByWithRelationInput = { [sort.field]: sort.order };

  const [equipments, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      select: equipmentSelect,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.equipment.count({ where }),
  ]);

  return {
    data: equipments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Criar novo equipamento
 */
export async function create(data: Prisma.EquipmentCreateInput) {
  return prisma.equipment.create({
    data,
    select: equipmentSelectFull,
  });
}

/**
 * Atualizar equipamento
 */
export async function update(id: string, data: Prisma.EquipmentUpdateInput) {
  return prisma.equipment.update({
    where: { id },
    data,
    select: equipmentSelectFull,
  });
}

/**
 * Deletar equipamento
 */
export async function remove(id: string) {
  return prisma.equipment.delete({
    where: { id },
  });
}

/**
 * Buscar equipamentos disponíveis
 */
export async function findAvailable(limit = 20) {
  return prisma.equipment.findMany({
    where: { isAvailable: true },
    select: equipmentSelect,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Buscar equipamentos por categoria
 */
export async function findByCategory(
  categoryId: string,
  pagination: PaginationOptions = { page: 1, limit: 20 }
) {
  return findMany({ categoryId, isAvailable: true }, pagination);
}

/**
 * Buscar equipamentos relacionados
 */
export async function findRelated(equipmentId: string, categoryId: string, limit = 4) {
  return prisma.equipment.findMany({
    where: {
      id: { not: equipmentId },
      categoryId,
      isAvailable: true,
    },
    select: equipmentSelect,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Verificar disponibilidade de quantidade
 */
export async function checkQuantity(id: string, requestedQuantity: number) {
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    select: { quantity: true, isAvailable: true },
  });

  if (!equipment) return { available: false, reason: 'not_found' };
  if (!equipment.isAvailable) return { available: false, reason: 'unavailable' };
  if (equipment.quantity < requestedQuantity) return { available: false, reason: 'insufficient_quantity' };

  return { available: true, quantity: equipment.quantity };
}

/**
 * Atualizar quantidade
 */
export async function updateQuantity(id: string, quantity: number, operation: 'increment' | 'decrement') {
  return prisma.equipment.update({
    where: { id },
    data: {
      quantity: operation === 'increment' ? { increment: quantity } : { decrement: quantity },
    },
    select: { id: true, quantity: true },
  });
}

/**
 * Contar equipamentos por categoria
 */
export async function countByCategory() {
  const counts = await prisma.equipment.groupBy({
    by: ['categoryId'],
    where: { isAvailable: true },
    _count: { id: true },
  });

  return counts;
}

export const equipmentRepository = {
  findById,
  findMany,
  create,
  update,
  remove,
  findAvailable,
  findByCategory,
  findRelated,
  checkQuantity,
  updateQuantity,
  countByCategory,
};

export default equipmentRepository;
