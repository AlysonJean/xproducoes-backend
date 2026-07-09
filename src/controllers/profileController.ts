import { z } from "zod";
// Esquema de validação para atualização de perfil de cliente
const clientProfileSchema = z.object({
  companyName: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  phone: z.string().optional(),
  address: z.any().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  budget: z.any().optional(),
  preferredCategories: z.array(z.string()).optional(),
  eventTypes: z.array(z.string()).optional(),
  communicationPrefs: z.any().optional(),
});
import { Request, Response } from "express";
import * as clientService from "../services/clientService";
import { prisma } from "../config/prisma";
import logger from "../config/logger";
import { AppError } from "../utils/errors";


export class ProfileController {
  // Buscar perfil completo do usuário
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          clientProfile: {
            include: {
              favorites: {
                include: { equipment: true },
              },
            },
          },
          collaboratorProfile: {
            include: {
              // portfolioItems: true, // Comentado - modelo não existe no schema
              reviews: true,
              availabilities: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "Usuário não encontrado" });
      }

      return res.json({ success: true, data: user });
    } catch (error) {
      logger.error({obj:error}, "Erro ao buscar perfil:");
      return res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  }

  // Atualizar perfil básico do usuário
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado" });
      }

      const { name, bio, location, website, socialLinks } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          bio,
          location,
          website,
          socialLinks,
        },
        include: {
          clientProfile: true,
          collaboratorProfile: true,
        },
      });

      return res.json({ success: true, data: updatedUser });
    } catch (error) {
      logger.error({obj:error}, "Erro ao atualizar perfil:");
      return res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  }

  // Buscar perfis de colaboradores com filtros
  async getCollaborators(req: Request, res: Response) {
    try {
      const { specialty, experience, location, minRate, maxRate, available } =
        req.query;

      const whereClause: Record<string, unknown> = {
        collaboratorProfile: {
          isNot: null,
          ...(specialty && { specialties: { has: specialty as string } }),
          ...(experience && { experience: experience as string }),
          ...(minRate && { hourlyRate: { gte: Number(minRate) } }),
          ...(maxRate && { hourlyRate: { lte: Number(maxRate) } }),
          ...(available && { availabilityStatus: "AVAILABLE" }),
        },
        ...(location && {
          location: { contains: location as string, mode: "insensitive" },
        }),
      };

      const collaborators = await prisma.user.findMany({
        where: whereClause,
        include: {
          collaboratorProfile: {
            include: {
              // portfolioItems: { // Comentado - modelo não existe no schema
              //   take: 5,
              //   orderBy: { createdAt: 'desc' }
              // },
              reviews: {
                take: 3,
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: {
          collaboratorProfile: { averageRating: "desc" },
        },
      });

      return res.json({ success: true, data: collaborators });
    } catch (error) {
      logger.error({obj:error}, "Erro ao buscar colaboradores:");
      return res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  }

  // Buscar detalhes de um colaborador específico
  async getCollaboratorDetails(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };

      const collaborator = await prisma.user.findUnique({
        where: { id },
        include: {
          collaboratorProfile: {
            include: {
              // portfolioItems: { // Comentado - modelo não existe no schema
              //   orderBy: { createdAt: 'desc' }
              // },
              reviews: {
                orderBy: { createdAt: "desc" },
              },
              availabilities: {
                where: {
                  date: { gte: new Date() },
                },
                orderBy: { date: "asc" },
              },
              // eventCollaborators: { // Comentado - campo não existe no schema Collaborator
              //   include: {
              //     booking: {
              //       select: { id: true, eventDate: true }
              //     }
              //   },
              //   orderBy: { createdAt: 'desc' },
              //   take: 10
              // }
            },
          },
        },
      });

      if (!collaborator) {
        return res.status(404).json({ success: false, message: "Colaborador não encontrado" });
      }

      return res.json({ success: true, data: collaborator });
    } catch (error) {
      logger.error({obj:error}, "Erro ao buscar detalhes do colaborador:");
      return res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  }

  // Atualizar perfil de colaborador
  async updateCollaboratorProfile(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId || typeof userId !== "string") {
        return res.status(401).json({ success: false, message: "Usuário não autenticado" });
      }

      const collaboratorProfile = await prisma.collaborator.findUnique({
        where: { userId },
      });

      if (!collaboratorProfile) {
        return res
          .status(404)
          .json({ success: false, message: "Perfil de colaborador não encontrado" });
      }

      const {
        specialties,
        experience,
        hourlyRate,
        phone,
        equipment,
        certifications,
      } = req.body;

      const updatedProfile = await prisma.collaborator.update({
        where: { userId },
        data: {
          specialties,
          experience,
          hourlyRate,
          phone,
          equipment: equipment || [],
          certifications: certifications || [],
        },
      });

      return res.json({ success: true, data: updatedProfile });
    } catch (error) {
      logger.error({obj:error}, "Erro ao atualizar perfil de colaborador:");
      return res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  }

  // Atualizar perfil de cliente (centralizado via clientService)
  async updateClientProfile(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado" });
      }
      const parsed = clientProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: "Dados inválidos", details: parsed.error.issues });
      }
      const updatedProfile = await clientService.updateClientProfileByUserId(userId, parsed.data);
      return res.json({ success: true, data: updatedProfile });
    } catch (error) {
      logger.error({obj:error}, "Erro ao atualizar perfil de cliente:");
      return res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  }

  // Adicionar item ao portfolio
  async addPortfolioItem(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado" });
      }

      const collaborator = await prisma.collaborator.findUnique({
        where: { userId },
      });

      if (!collaborator) {
        return res
          .status(404)
          .json({ success: false, message: "Perfil de colaborador não encontrado" });
      }

      // Os campos do req.body não são usados pois a funcionalidade não está implementada
      throw new AppError(
        "Portfolio functionality not implemented - PortfolioItem model missing from schema",
        501,
        true,
        "PORTFOLIO_NOT_IMPLEMENTED"
      );
    } catch (error) {
      logger.error({obj:error}, "Erro ao adicionar item ao portfolio:");
      return res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  }

  // Buscar clientes com filtros (centralizado via clientService)
  async getClients(req: Request, res: Response) {
    try {
      const industry = req.query.industry as string | undefined;
      const companySize = req.query.companySize as string | undefined;
      const location = req.query.location as string | undefined;
      const clients = await clientService.listClientsWithProfiles({ industry, companySize, location });
      return res.json({ success: true, data: clients });
    } catch (error) {
      logger.error({obj:error}, "Erro ao buscar clientes:");
      return res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  }
}

export const profileController = new ProfileController();
