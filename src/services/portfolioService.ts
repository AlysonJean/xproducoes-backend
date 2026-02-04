import { prisma } from "../config/prisma";
import logger from "../config/logger";
import type { Prisma } from "@prisma/client";


export async function updatePortfolio(id: string, data: Partial<{ title: string; description: string; eventDate: string | Date; imageUrl?: string; }>) {
  const updateData: Prisma.PortfolioUpdateInput = {};
  if (data.title) updateData.title = data.title.trim();
  if (data.description) updateData.description = data.description.trim();
  if (data.eventDate) {
    const eventDate = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;
    if (!isNaN(eventDate.getTime())) updateData.eventDate = eventDate;
  }
  if (data.imageUrl) updateData.imageUrl = data.imageUrl;
  return prisma.portfolio.update({ where: { id }, data: updateData });
}

export async function create(
  data: {
    title: string;
    description: string;
    eventDate: string | Date;
    imageUrl?: string;
  }
) {
  // Validação dos dados
  if (!data.title || !data.description || !data.eventDate) {
    throw new Error('Dados obrigatórios não fornecidos: title, description, eventDate');
  }

  // Validar se imageUrl está presente (vindo do middleware do Cloudinary)
  if (!data.imageUrl) {
    throw new Error('Imagem é obrigatória');
  }

  let eventDate: Date;
  try {
    eventDate = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;
    if (isNaN(eventDate.getTime())) {
      throw new Error('Data inválida fornecida');
    }
  } catch {
    throw new Error('Erro ao processar data do evento');
  }

  const portfolioData: {
    title: string;
    description: string;
    eventDate: Date;
    imageUrl: string;
  } = {
    title: data.title.trim(),
    description: data.description.trim(),
    eventDate: eventDate,
    imageUrl: data.imageUrl, // URL do Cloudinary
    sortOrder: 0, // Será atualizado abaixo
  };
  
  try {
    // Obter o último sortOrder para colocar no fim da lista
    const lastItem = await prisma.portfolio.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });
    
    portfolioData.sortOrder = (lastItem?.sortOrder ?? 0) + 1;

    return await prisma.portfolio.create({ data: portfolioData });
  } catch (error) {
    logger.error({obj:error}, 'Erro ao criar portfólio no banco de dados:');
    throw new Error('Erro interno ao salvar portfólio');
  }
}

export async function findAll() {
  return prisma.portfolio.findMany({ 
    orderBy: [
      { sortOrder: "asc" },
      { eventDate: "desc" }
    ] 
  });
}

export async function updateOrder(items: { id: string; sortOrder: number }[]) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.portfolio.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );
}

export async function deletePortfolio(id: string) {
  return prisma.portfolio.delete({ where: { id } });
}
