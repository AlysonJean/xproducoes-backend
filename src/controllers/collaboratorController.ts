import { Request, Response } from "express";
import { CollaboratorService } from "../services/collaboratorService";
import { z } from "zod";
import { prisma } from "../config/prisma";

const collaboratorService = new CollaboratorService();

// Schemas de validação
const createCollaboratorSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  role: z.enum([
    "PHOTOGRAPHER",
    "VIDEOGRAPHER",
    "SOUND_TECHNICIAN",
    "LIGHTING_TECHNICIAN",
    "DJ",
    "PRESENTER",
    "COORDINATOR",
    "ASSISTANT",
    "SECURITY",
    "TRANSPORT",
    "OTHER",
  ]),
  specialties: z.array(z.string()).default([]),
  hourlyRate: z.number().min(0, "Taxa deve ser positiva"),
  fixedRate: z.number().optional(),
  commissionRate: z.number().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  availabilityStatus: z.enum(["AVAILABLE", "BUSY", "OFF_DUTY"]).optional(),
});

const assignCollaboratorSchema = z.object({
  eventId: z.string().uuid("ID do evento inválido"),
  collaboratorId: z.string().uuid("ID do colaborador inválido"),
  role: z.enum([
    "PHOTOGRAPHER",
    "VIDEOGRAPHER",
    "SOUND_TECHNICIAN",
    "LIGHTING_TECHNICIAN",
    "DJ",
    "PRESENTER",
    "COORDINATOR",
    "ASSISTANT",
    "SECURITY",
    "TRANSPORT",
    "OTHER",
  ]),
  startTime: z.string().min(1, "Hora de início é obrigatória"),
  endTime: z.string().min(1, "Hora de fim é obrigatória"),
  hourlyRate: z.number().optional(),
  fixedRate: z.number().optional(),
  status: z
    .enum([
      "ASSIGNED",
      "CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ])
    .optional(),
  notes: z.string().optional(),
});

export class CollaboratorController {
  // CRUD de Colaboradores
  async createCollaborator(req: Request, res: Response) {
    try {
      const validatedData = createCollaboratorSchema.parse(req.body);

      // Mapear 'role' para 'collaboratorRole' e incluir dados do usuário
      const collaboratorData = {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        collaboratorRole: validatedData.role,
        specialties: validatedData.specialties,
        hourlyRate: validatedData.hourlyRate,
        fixedRate: validatedData.fixedRate,
        commissionRate: validatedData.commissionRate,
        status: validatedData.status,
        availabilityStatus: validatedData.availabilityStatus,
      };

      const collaborator =
        await collaboratorService.createCollaborator(collaboratorData);

      return res.status(201).json({
        success: true,
        data: collaborator,
        message: "Colaborador criado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao criar colaborador:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.issues,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async getAllCollaborators(req: Request, res: Response) {
    try {
      const collaborators = await collaboratorService.getAllCollaborators();

      return res.json({
        success: true,
        data: collaborators,
      });
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar colaboradores",
      });
    }
  }

  async getCollaboratorById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID do colaborador é obrigatório",
        });
      }

      const collaborator = await collaboratorService.getCollaboratorById(id);

      if (!collaborator) {
        return res.status(404).json({
          success: false,
          message: "Colaborador não encontrado",
        });
      }

      return res.json({
        success: true,
        data: collaborator,
      });
    } catch (error) {
      console.error("Erro ao buscar colaborador:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar colaborador",
      });
    }
  }

  async updateCollaborator(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID do colaborador é obrigatório",
        });
      }

      const collaborator = await collaboratorService.updateCollaborator(
        id,
        updateData,
      );

      return res.json({
        success: true,
        data: collaborator,
        message: "Colaborador atualizado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao atualizar colaborador:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar colaborador",
      });
    }
  }

  async deleteCollaborator(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID do colaborador é obrigatório",
        });
      }

      await collaboratorService.deleteCollaborator(id);

      return res.json({
        success: true,
        message: "Colaborador removido com sucesso",
      });
    } catch (error) {
      console.error("Erro ao deletar colaborador:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao deletar colaborador",
      });
    }
  }

  // Gestão de Eventos
  async assignCollaboratorToEvent(req: Request, res: Response) {
    try {
      const validatedData = assignCollaboratorSchema.parse(req.body);

      const assignment = await collaboratorService.assignCollaboratorToEvent({
        ...validatedData,
        bookingId: validatedData.eventId,
      });

      return res.status(201).json({
        success: true,
        data: assignment,
        message: "Colaborador atribuído ao evento com sucesso",
      });
    } catch (error) {
      console.error("Erro ao atribuir colaborador:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.issues,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Erro ao atribuir colaborador ao evento",
      });
    }
  }

  async getEventCollaborators(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "ID do evento é obrigatório",
        });
      }

      const collaborators =
        await collaboratorService.getEventCollaborators(eventId);

      return res.json({
        success: true,
        data: collaborators,
      });
    } catch (error) {
      console.error("Erro ao buscar colaboradores do evento:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar colaboradores do evento",
      });
    }
  }

  async getCollaboratorEvents(req: Request, res: Response) {
    try {
      const { collaboratorId } = req.params;

      if (!collaboratorId) {
        return res.status(400).json({
          success: false,
          message: "ID do colaborador é obrigatório",
        });
      }

      const events =
        await collaboratorService.getCollaboratorEvents(collaboratorId);

      return res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      console.error("Erro ao buscar eventos do colaborador:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar eventos do colaborador",
      });
    }
  }

  async updateEventCollaborator(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID da atribuição é obrigatório",
        });
      }

      // Método não implementado no service
      return res.status(501).json({
        success: false,
        message: "Atualização de colaborador em evento não implementada ainda",
      });
    } catch (error) {
      console.error("Erro ao atualizar atribuição:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar atribuição",
      });
    }
  }

  async removeCollaboratorFromEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID da atribuição é obrigatório",
        });
      }

      // Método não implementado no service
      return res.status(501).json({
        success: false,
        message: "Remoção de colaborador de evento não implementada ainda",
      });
    } catch (error) {
      console.error("Erro ao remover colaborador do evento:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao remover colaborador do evento",
      });
    }
  }

  // Busca e estatísticas
  async searchCollaborators(req: Request, res: Response) {
    try {
      const { role, status, name, page = "1", limit = "10" } = req.query;

      const searchParams = {
        role: role as any,
        status: status as any,
        name: name as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const result =
        await collaboratorService.searchCollaborators(searchParams);

      return res.json({
        success: true,
        data: result.collaborators,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar colaboradores",
      });
    }
  }

  async getCollaboratorStats(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID do colaborador é obrigatório",
        });
      }

      const stats = await collaboratorService.getCollaboratorStats(id);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar estatísticas do colaborador",
      });
    }
  }

  // Dashboard pessoal do colaborador (ou admin vendo um colaborador específico)
  async getMyDashboard(req: Request, res: Response) {
    try {
      // Obter ID do usuário autenticado
      const userId = req.userId as string;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Buscar o colaborador pelo userId
      let collaborator = await collaboratorService.findByUserId(userId);
      
      if (!collaborator) {
        // Tentar criar perfil automaticamente se não existir (mesma lógica do getMyProfile)
        try {
          console.log(`[Dashboard] Perfil não encontrado para usuário ${userId}. Criando perfil padrão...`);
          collaborator = await prisma.collaborator.create({
            data: {
              userId,
              collaboratorRole: 'OTHER',
              status: 'PENDING_APPROVAL',
              specialties: [],
            },
            include: { user: true }
          }) as any;
        } catch (createError) {
          console.error('[Dashboard] Erro ao criar perfil automático:', createError);
          return res.status(404).json({ success: false, message: 'Colaborador não encontrado' });
        }
      }

      // Reutiliza o service para agregar os dados do dashboard
      const stats = await collaboratorService.getCollaboratorDashboard(collaborator.id);

      return res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erro ao buscar dashboard do colaborador:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar dashboard do colaborador' });
    }
  }

  // Perfil pessoal do colaborador
  async getMyProfile(req: Request, res: Response) {
    try {
      // Obter ID do usuário autenticado
      const userId = req.userId as string;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Buscar o colaborador pelo userId
      let collaborator = await collaboratorService.findByUserId(userId);
      
      if (!collaborator) {
        // Auto-criação de perfil para usuários com role COLLABORATOR que ainda não possuem registro
        // Isso corrige o problema de "Perfil não encontrado" para usuários recém-promovidos
        try {
          console.log(`Perfil não encontrado para usuário ${userId}. Criando perfil padrão...`);
          
          // Verificar se já existe (concorrência) ou criar
          collaborator = await prisma.collaborator.create({
            data: {
              userId,
              collaboratorRole: 'OTHER',
              status: 'PENDING_APPROVAL',
              specialties: [],
            },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  avatarUrl: true,
                  bio: true,
                  location: true,
                  website: true,
                }
              }
            }
          }) as any;
          
        } catch (createError) {
          console.error('Erro ao criar perfil automático:', createError);
          return res.status(404).json({ success: false, message: 'Colaborador não encontrado' });
        }
      }
      
      return res.json({ success: true, data: collaborator });
    } catch (error) {
      console.error('Erro ao buscar perfil do colaborador:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar perfil do colaborador' });
    }
  }

  // Meus eventos
  async getMyEvents(req: Request, res: Response) {
    try {
      const userId = req.userId as string;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      const collaborator = await collaboratorService.findByUserId(userId);
      
      if (!collaborator) {
        return res.status(404).json({ success: false, message: 'Colaborador não encontrado' });
      }
      
      const events = await collaboratorService.getCollaboratorEvents(collaborator.id);

      return res.json({ success: true, data: events });
    } catch (error) {
      console.error('Erro ao buscar eventos do colaborador:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar eventos do colaborador' });
    }
  }

  // Atualizar perfil do colaborador
  async updateMyProfile(req: Request, res: Response) {
    try {
      const userId = req.userId as string;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      const collaborator = await collaboratorService.findByUserId(userId);
      
      if (!collaborator) {
        return res.status(404).json({ success: false, message: 'Colaborador não encontrado' });
      }

      const {
        phone,
        experience,
        hourlyRate,
        workingRadius,
        languages,
        specialties,
        equipment,
        certifications,
      } = req.body;

      const updatedCollaborator = await collaboratorService.update(collaborator.id, {
        phone,
        experience,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        workingRadius: workingRadius ? parseInt(workingRadius) : undefined,
        languages: languages || [],
        specialties: specialties || [],
        equipment: equipment || [],
        certifications: certifications || [],
      });

      return res.json({ success: true, data: updatedCollaborator });
    } catch (error) {
      console.error('Erro ao atualizar perfil do colaborador:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar perfil do colaborador' });
    }
  }

  async getAvailableCollaborators(req: Request, res: Response) {
    try {
      const { date, role } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: "Data é obrigatória",
        });
      }

      const collaborators = await collaboratorService.getAvailableCollaborators({
        date: date as string,
        role: role as string,
      });

      return res.json({
        success: true,
        data: collaborators,
      });
    } catch (error) {
      console.error("Erro ao buscar colaboradores disponíveis:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar colaboradores disponíveis",
      });
    }
  }

  // Gerenciamento de Disponibilidades
  async getAllAvailabilities(req: Request, res: Response) {
    try {
      const availabilities = await collaboratorService.getAllAvailabilities();

      return res.json({
        success: true,
        data: availabilities,
      });
    } catch (error) {
      console.error("Erro ao buscar disponibilidades:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar disponibilidades",
      });
    }
  }

  async createAvailability(req: Request, res: Response) {
    try {
      const availabilitySchema = z.object({
        collaboratorId: z.string().uuid("ID do colaborador inválido").optional(), // Opcional se for chamada via /me
        startDate: z.string().min(1, "Data de início é obrigatória"),
        endDate: z.string().min(1, "Data de fim é obrigatória"),
        startTime: z.string().default("00:00"),
        endTime: z.string().default("23:59"),
        status: z.enum(["AVAILABLE", "BUSY", "OFF_DUTY"]).default("AVAILABLE"),
        notes: z.string().optional(),
      });

      const validatedData = availabilitySchema.parse(req.body);
      let collaboratorId = validatedData.collaboratorId;

      // Se não houver collaboratorId no body, tentar obter do usuário autenticado
      if (!collaboratorId && req.userId) {
         const collaborator = await collaboratorService.findByUserId(req.userId);
         if (collaborator) {
           collaboratorId = collaborator.id;
         }
      }

      if (!collaboratorId) {
        return res.status(400).json({ success: false, message: "ID do colaborador é obrigatório" });
      }

      // Converter strings de data para Date objects se necessário
      // O repositório espera Date objects para as datas
      // Assumindo que o front envia ISO strings YYYY-MM-DD
      const avail = await collaboratorService.createAvailability({
        collaboratorId,
        date: new Date(validatedData.startDate), // Simplificação: usando startDate como a data do registro
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        status: validatedData.status,
        notes: validatedData.notes
      });

      return res.status(201).json({
        success: true,
        data: avail,
        message: "Disponibilidade criada com sucesso"
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.issues,
        });
      }

      console.error("Erro ao criar disponibilidade:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao criar disponibilidade",
      });
    }
  }

  async updateAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateSchema = z.object({
        date: z.string().optional(), // Mudado de start/endDate para date para alinhar com modelo
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        status: z.enum(["AVAILABLE", "BUSY", "OFF_DUTY"]).optional(),
        notes: z.string().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      
      const updateData: any = { ...validatedData };
      if (validatedData.date) {
        updateData.date = new Date(validatedData.date);
      }

      const updated = await collaboratorService.updateAvailability(id, updateData);

      return res.json({
        success: true,
        data: updated,
        message: "Disponibilidade atualizada"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.issues,
        });
      }

      console.error("Erro ao atualizar disponibilidade:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar disponibilidade",
      });
    }
  }

  async deleteAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await collaboratorService.deleteAvailability(id);
      return res.json({
        success: true,
        message: "Disponibilidade removida com sucesso",
      });
    } catch (error) {
      console.error("Erro ao remover disponibilidade:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao remover disponibilidade",
      });
    }
  }

  async getCollaboratorAvailabilities(req: Request, res: Response) {
    try {
      const { collaboratorId } = req.params;
      const availabilities = await collaboratorService.getCollaboratorAvailabilities(collaboratorId);

      return res.json({
        success: true,
        data: availabilities,
      });
    } catch (error) {
      console.error("Erro ao buscar disponibilidades do colaborador:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar disponibilidades do colaborador",
      });
    }
  }

  // --- MÉTODOS /ME (Usuário Autenticado) ---

  async getMyAvailability(req: Request, res: Response) {
      try {
        const userId = req.userId as string;
        if (!userId) return res.status(401).json({ success: false, message: 'Não autenticado' });

        const collaborator = await collaboratorService.findByUserId(userId);
        if (!collaborator) return res.status(404).json({ success: false, message: 'Perfil de colaborador não encontrado' });

        const availabilities = await collaboratorService.getCollaboratorAvailabilities(collaborator.id);
        return res.json({ success: true, data: availabilities });
      } catch (error) {
        console.error("Erro ao buscar minha disponibilidade:", error);
        return res.status(500).json({ success: false, message: "Erro interno" });
      }
  }

  async getMyPayments(req: Request, res: Response) {
      try {
        const userId = req.userId as string;
        if (!userId) return res.status(401).json({ success: false, message: 'Não autenticado' });

        const collaborator = await collaboratorService.findByUserId(userId);
        if (!collaborator) return res.status(404).json({ success: false, message: 'Perfil de colaborador não encontrado' });

        const payments = await collaboratorService.getCollaboratorPayments(collaborator.id);
        return res.json({ success: true, data: payments });
      } catch (error) {
        console.error("Erro ao buscar meus pagamentos:", error);
        return res.status(500).json({ success: false, message: "Erro interno" });
      }
  }

  async getMyStats(req: Request, res: Response) {
      try {
        const userId = req.userId as string;
        if (!userId) return res.status(401).json({ success: false, message: 'Não autenticado' });

        const collaborator = await collaboratorService.findByUserId(userId);
        if (!collaborator) return res.status(404).json({ success: false, message: 'Perfil de colaborador não encontrado' });

        const stats = await collaboratorService.getCollaboratorStats(collaborator.id);
        return res.json({ success: true, data: stats });
      } catch (error) {
        console.error("Erro ao buscar minhas estatísticas:", error);
        return res.status(500).json({ success: false, message: "Erro interno" });
      }
  }

  // Gerenciamento de Pagamentos
  async getAllPayments(req: Request, res: Response) {
    try {
      const payments = await collaboratorService.getAllPayments();

      return res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Erro ao buscar pagamentos:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar pagamentos",
      });
    }
  }

  async createPayment(req: Request, res: Response) {
    try {
      const paymentSchema = z.object({
        collaboratorId: z.string().uuid("ID do colaborador inválido"),
        eventId: z.string().uuid("ID do evento inválido").optional(),
        amount: z.number().min(0, "Valor deve ser positivo"),
        type: z.enum(["HOURLY", "FIXED", "COMMISSION", "BONUS", "DEDUCTION"]),
        description: z.string().optional(),
        paymentDate: z.string().min(1, "Data de pagamento é obrigatória"),
        status: z.enum(["PENDING", "PAID", "CANCELLED"]).default("PENDING"),
        notes: z.string().optional(),
      });

      const validatedData = paymentSchema.parse(req.body);
      // Usar createPaymentRecord em vez de createPayment
      const payment = await collaboratorService.createPaymentRecord({
        collaboratorId: validatedData.collaboratorId,
        eventId: validatedData.eventId,
        amount: validatedData.amount,
        type: validatedData.type,
        description: validatedData.description || "Pagamento manual",
        dueDate: validatedData.paymentDate,
        notes: validatedData.notes,
      });

      return res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.issues,
        });
      }

      console.error("Erro ao criar pagamento:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao criar pagamento",
      });
    }
  }

  async updatePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateSchema = z.object({
        amount: z.number().min(0).optional(),
        description: z.string().optional(),
        paymentDate: z.string().optional(),
        status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
        notes: z.string().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do pagamento é obrigatório' });
      }

      // Autorização: apenas ADMIN ou (possivelmente) o próprio colaborador - aqui permitimos ADMIN
      if (req.userRole !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      }

  const updated = await collaboratorService.updatePayment(id, validatedData);

      return res.json({ success: true, data: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.issues,
        });
      }

      console.error("Erro ao atualizar pagamento:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar pagamento",
      });
    }
  }

  async deletePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Método não implementado no service
      return res.status(501).json({
        success: false,
        message: "Remoção de pagamento não implementada ainda",
      });
    } catch (error) {
      console.error("Erro ao remover pagamento:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao remover pagamento",
      });
    }
  }

  async getCollaboratorPayments(req: Request, res: Response) {
    try {
      const { collaboratorId } = req.params;
      // Método implementado no service
      const payments = await collaboratorService.getCollaboratorPayments(collaboratorId);

      return res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Erro ao buscar pagamentos do colaborador:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar pagamentos do colaborador",
      });
    }
  }

  async getPaymentStats(req: Request, res: Response) {
    try {
      const { collaboratorId } = req.params;
      // Método não implementado no service - retorna stats padrão
      const stats = await collaboratorService.getPaymentStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas de pagamentos:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar estatísticas de pagamentos",
      });
    }
  }

  // Minhas notificações
  async getMyNotifications(req: Request, res: Response) {
    try {
      const userId = req.userId as string;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return res.json({ success: true, data: notifications });
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar notificações' });
    }
  }

  // Buscar todos os event collaborators (para o contexto frontend)
  async getAllEventCollaborators(req: Request, res: Response) {
    try {
      // Por enquanto, retornar array vazio até implementar no repository
      const eventCollaborators: any[] = [];

      return res.json({
        success: true,
        data: eventCollaborators,
      });
    } catch (error) {
      console.error("Erro ao buscar todos os event collaborators:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar event collaborators",
      });
    }
  }
}

// Instância única do controller
const collaboratorController = new CollaboratorController();

// Exportar métodos do controller
export const {
  createCollaborator,
  getAllCollaborators,
  getCollaboratorById,
  updateCollaborator,
  deleteCollaborator,
  assignCollaboratorToEvent,
  getAllEventCollaborators,
  getEventCollaborators,
  getCollaboratorEvents,
  updateEventCollaborator,
  removeCollaboratorFromEvent,
  searchCollaborators,
  getCollaboratorStats,
  getMyDashboard,
  getMyProfile,
  updateMyProfile,
  getAvailableCollaborators,
  getAllAvailabilities,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getCollaboratorAvailabilities,
  getAllPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getCollaboratorPayments,
  getPaymentStats,
  getMyAvailability,
  getMyPayments,
  getMyStats,
  getMyEvents,
  getMyNotifications,
} = collaboratorController;

// Alias para createEventCollaborator
export const createEventCollaborator = assignCollaboratorToEvent;
