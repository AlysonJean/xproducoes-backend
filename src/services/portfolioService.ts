import { prisma } from "../config/prisma";
import logger from "../config/logger";
import type { Prisma } from "@prisma/client";
import { AppError, BadRequestError } from "../utils/errors";


export async function updatePortfolio(id: string, data: Partial<{ title: string; description: string; eventDate: string | Date; imageUrl?: string; isPinned?: boolean; uploadedFiles?: any[]; coverIndex?: string | number }>) {
  const updateData: Prisma.PortfolioUpdateInput = {};
  if (data.title) updateData.title = data.title.trim();
  if (data.description) updateData.description = data.description.trim();
  
  // Handle boolean coercion from string (common with FormData)
  if (data.isPinned !== undefined) {
    updateData.isPinned = data.isPinned === true || (data.isPinned as any) === 'true';
  }

  if (data.eventDate) {
    const eventDate = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;
    if (!isNaN(eventDate.getTime())) updateData.eventDate = eventDate;
  }
  
  // If uploadedFiles present, add them
  if (data.uploadedFiles && data.uploadedFiles.length > 0) {
    const files = data.uploadedFiles; // for type safety
    await prisma.$transaction(async (tx) => {
      // Create media items
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isCover = typeof data.coverIndex !== 'undefined' && Number(data.coverIndex) === i;
        
        await tx.portfolioMedia.create({
          data: {
            portfolioId: id,
            url: file.url,
            type: file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            filename: file.filename,
            mimeType: file.mimetype,
            isCover: isCover
          }
        });

        // If this is the cover, update the parent
        if (isCover) {
             updateData.imageUrl = file.url;
             updateData.coverImage = file.url;
        }
      }
    });

    // If imageUrl was passed (legacy or explicit existing cover), it overrides
    if (data.imageUrl) {
      updateData.imageUrl = data.imageUrl;
      updateData.coverImage = data.imageUrl;
    }
  }

  return prisma.portfolio.update({ 
    where: { id }, 
    data: updateData,
    include: { media: { orderBy: { sortOrder: 'asc' } } }
  });
}

export async function create(
  data: {
    title: string;
    description: string;
    eventDate: string | Date;
    imageUrl?: string;
    isPinned?: boolean;
    uploadedFiles?: Array<{ url: string; filename: string; mimetype: string; size: number }>;
    coverIndex?: string | number;
  }
) {
  // Validação dos dados
  if (!data.title || !data.description || !data.eventDate) {
    throw new BadRequestError('Dados obrigatórios não fornecidos: title, description, eventDate');
  }

  let eventDate: Date;
  try {
    eventDate = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;
    if (isNaN(eventDate.getTime())) {
      throw new BadRequestError('Data inválida fornecida');
    }
  } catch {
    throw new BadRequestError('Erro ao processar data do evento');
  }

  // Determine cover image and media items
  const mediaItems = data.uploadedFiles || [];
  let coverUrl = data.imageUrl || '';
  let coverIndex = data.coverIndex ? Number(data.coverIndex) : 0;

  // Use the first file as cover if no imageUrl provided and files exist
  if (!coverUrl && mediaItems.length > 0) {
    // If coverIndex is out of bounds, use 0
    if (coverIndex < 0 || coverIndex >= mediaItems.length) coverIndex = 0;
    
    // Only set coverUrl if it's an image, or generic placeholder if video?
    // For now, use the url. Frontend handles video thumbnails? 
    // Usually videos on cloudinary have a .jpg thumbnail url. 
    // But let's just use the url.
    coverUrl = mediaItems[coverIndex].url;
  }

  try {
    // Obter o último sortOrder para colocar no fim da lista
    const lastItem = await prisma.portfolio.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });
    
    const sortOrder = (lastItem?.sortOrder ?? 0) + 1;

    // Transaction to create Portfolio and Media
    const result = await prisma.$transaction(async (tx) => {
      const portfolio = await tx.portfolio.create({
        data: {
          title: data.title.trim(),
          description: data.description.trim(),
          eventDate: eventDate,
          imageUrl: coverUrl,
          coverImage: coverUrl,
          sortOrder: sortOrder,
          isPinned: data.isPinned === true || (data.isPinned as any) === 'true',
        }
      });

      if (mediaItems.length > 0) {
        await tx.portfolioMedia.createMany({
          data: mediaItems.map((file, index) => ({
            portfolioId: portfolio.id,
            url: file.url,
            type: file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            filename: file.filename,
            mimeType: file.mimetype,
            isCover: index === coverIndex,
            sortOrder: index
          }))
        });
      }

      return portfolio;
    });

    return result;

  } catch (error) {
    logger.error({obj:error}, 'Erro ao criar portfólio no banco de dados:');
    throw new AppError('Erro interno ao salvar portfólio', 500, true, 'PORTFOLIO_SAVE_FAILED');
  }
}

export async function findAll() {
  return prisma.portfolio.findMany({ 
    include: {
      media: {
        orderBy: { sortOrder: 'asc' }
      }
    },
    orderBy: [
      { isPinned: "desc" },
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
  // Get portfolio with all media URLs before deletion
  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    select: { media: { select: { url: true } } }
  });

  // Delete all media files from Cloudinary
  if (portfolio?.media && portfolio.media.length > 0) {
    const { UploadService } = await import('./uploadService');
    const uploadService = new UploadService();
    
    for (const media of portfolio.media) {
      if (media.url) {
        await uploadService.deleteFile(media.url);
      }
    }
  }

  return prisma.portfolio.delete({ where: { id } });
}

// New method to set cover
export async function setCoverVideo(portfolioId: string, mediaId: string) {
    // Transaction to unset old cover and set new one
    await prisma.$transaction([
        prisma.portfolioMedia.updateMany({
            where: { portfolioId },
            data: { isCover: false }
        }),
        prisma.portfolioMedia.update({
            where: { id: mediaId },
            data: { isCover: true }
        })
    ]);
    
    // Update parent cache
    const media = await prisma.portfolioMedia.findUnique({ where: { id: mediaId } });
    if (media) {
        await prisma.portfolio.update({
            where: { id: portfolioId },
            data: { 
                imageUrl: media.url,
                coverImage: media.url
            }
        });
    }
}
