import { z } from "zod";
import { idSchema } from "../utils/sharedSchema";

// ✅ Schemas Zod para validação completa
// (Preparados para uso futuro em endpoints específicos)
/* eslint-disable @typescript-eslint/no-unused-vars */
const clientProfileSchema = z.object({
  companyName: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(), // E.164 format
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  budget: z.number().positive().optional(),
  preferredCategories: z.array(z.string()).optional(),
  eventTypes: z.array(z.string()).optional(),
  communicationPrefs: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
  }).optional(),
}).strict();

const userProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
}).strict();
/* eslint-enable @typescript-eslint/no-unused-vars */

const createClientSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  companyName: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  status: z.enum(['ACTIVE','INACTIVE','SUSPENDED']).optional(),
  password: z.string().min(8).optional(),
  userId: idSchema.optional(),
}).strict();
// Caminho: backend/src/controllers/adminController.ts

import { Request, Response, NextFunction } from "express";
import * as userService from "../services/userService";
import * as clientService from "../services/clientService";
import { prisma } from "../config/prisma";
import { BookingService } from "../services/bookingService";
import { EquipmentService } from "../services/equipmentService";
import logger from "../config/logger";
import { UploadService } from "../services/uploadService";
import EmailService from "../services/emailService";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { BookingStatus, Client, User, Prisma } from "@prisma/client";
import { isPrismaError } from "../types/common";
import { NotFoundError } from "../utils/errors";

const bookingService = new BookingService();
const equipmentService = new EquipmentService();

// ✅ Helper function para mapear cliente (elimina duplicação)
function mapClientResponse(client: Client & { user?: User | null }) {
  const user = client.user;
  return {
    id: client.id,
    userId: client.userId,
    name: user?.name ?? client.companyName ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'CLIENT',
    bio: user?.bio ?? '',
    location: user?.location ?? '',
    phone: client.phone ?? '',
    avatar: user?.avatarUrl ?? '',
    isActive: user?.isActive ?? true,
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
  };
}

export class AdminController {

  // Criar novo cliente (validação, checagem de duplicata, upload avatar, transação)
  createClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ✅ Usar schema validado
      const payload = await createClientSchema.parseAsync(req.body || {});

      // ✅ NÃO fazer check-then-act - deixar unique constraint tratar
      // Preparar dados
      const userData: Prisma.UserCreateInput = {
        email: '',
        name: '',
        passwordHash: '',
        role: 'CLIENT',
      };
      if (payload.email) userData.email = payload.email.toLowerCase().trim();
      if (payload.name) userData.name = payload.name.trim();
      userData.role = 'CLIENT';
      if (typeof payload.status !== 'undefined') userData.isActive = payload.status === 'ACTIVE';

      // Avatar via upload middleware (req.file) -> usa UploadService
      let avatarUrl: string | undefined = undefined;
      const uploadedFile = req.file;
      if (uploadedFile) {
        const us = new UploadService();
        avatarUrl = await us.uploadAvatar(userData.email ?? 'temp', uploadedFile);
        userData.avatarUrl = avatarUrl;
      }

      // Criação atômica: se enviar user data, cria user e client em transação
      let tempPassword: string | undefined;
      let inviteToken: string | undefined;

      const result = await prisma.$transaction(async (tx) => {
        let createdUser: User | null = null;
        if (payload.email) {
          // Se não enviou senha, gera uma temporária e cria token de convite
          if (!payload.password) {
            tempPassword = crypto.randomBytes(9).toString('hex'); // ~18 chars
            inviteToken = crypto.randomBytes(20).toString('hex');
          }

          createdUser = await tx.user.create({
            data: {
              ...userData,
              passwordHash: (payload.password ? await bcrypt.hash(payload.password, 10) : await bcrypt.hash(tempPassword || '', 10)),
              passwordResetToken: inviteToken,
              passwordResetTokenExpiry: inviteToken ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
            },
          });
        }

        const clientData: Prisma.ClientCreateInput = {
          user: createdUser ? { connect: { id: createdUser.id } } : payload.userId ? { connect: { id: payload.userId } } : undefined as unknown as Prisma.UserCreateNestedOneWithoutClientProfileInput,
          phone: payload.phone,
          companyName: payload.companyName,
          industry: payload.industry,
          companySize: payload.companySize,
        };

        const createdClient = await tx.client.create({ data: clientData });

        return { createdUser, createdClient };
      });

      // Audit log mínimo (se houver sistema de audit, gravar; caso contrário, logar)
      try {
        const actorId = req.user?.id || 'system';
        logger.info(`admin.createClient actor=${actorId} clientId=${result.createdClient.id}`);
      } catch (e) {
        logger.warn('Falha ao gravar audit in-memory: ' + String(e));
      }

      const client = await prisma.client.findUnique({ where: { id: result.createdClient.id }, include: { user: true } });

      // Se geramos senha temporária, montar link de convite para o frontend
      let inviteUrl: string | undefined = undefined;
      if (inviteToken) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        inviteUrl = `${frontendUrl}/complete-registration?token=${inviteToken}`;
      }

      // Envia e-mail de convite se configurado
      let emailSent = false;
      try {
        if (inviteUrl && client?.user?.email && tempPassword) {
          await EmailService.sendInviteEmail(client.user.email, inviteUrl, tempPassword);
          emailSent = true;
        }
      } catch (e) {
        logger.warn('Falha ao enviar email de convite: ' + String(e));
      }

      // ✅ NUNCA retornar senha temporária na resposta HTTP
      return res.status(201).json({ 
        success: true,
        message: emailSent 
          ? 'Cliente criado com sucesso. Email de convite enviado.'
          : 'Cliente criado com sucesso. Atenção: não foi possível enviar o email de convite.',
        data: {
          client,
          inviteUrl,
          emailSent,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: 'Validação falhou', issues: error.issues });
      }
      // ✅ Tratar unique constraint violation (email duplicado)
      if (isPrismaError(error) && error.code === 'P2002') {
        return res.status(409).json({ 
          success: false,
          code: 'EMAIL_EXISTS', 
          message: 'Email já cadastrado. Use outro endereço de email.',
          field: (Array.isArray(error.meta?.target) ? error.meta?.target[0] : undefined) || 'email'
        });
      }
      return next(error);
    }
  };

  // Listar todos os clientes com perfil
  listClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { industry, companySize, location } = req.query;
      
      // Configuração de Paginação Otimizada para Recursos
      // Em DEV: Limite alto (1000) para facilitar visualização sem paginação no frontend
      // Em PROD: Limite seguro (50) para economizar RAM, mas cobrir seus ~30 clientes previstos
      const defaultPageSize = process.env.NODE_ENV === 'production' ? 50 : 1000;
      
      const page = parseInt((req.query.page as string) || '1', 10);
      const pageSize = parseInt((req.query.pageSize as string) || String(defaultPageSize), 10);

      // Bloqueio de segurança hard-limit para evitar OOM em produção caso o client requisite pageSize gigante
      const finalPageSize = process.env.NODE_ENV === 'production' && pageSize > 100 ? 100 : pageSize;

      // Busca total de clientes para meta
      const total = await clientService.countClientsWithProfiles({ industry, companySize, location });
      // Busca clientes paginados
      const clients = await clientService.listClientsWithProfiles({ 
        industry, 
        companySize, 
        location, 
        page, 
        pageSize: finalPageSize 
      });

      return res.json({
        success: true,
        data: clients,
        meta: {
          total,
          page,
          pageSize: finalPageSize,
          totalPages: Math.ceil(total / finalPageSize),
        },
      });
    } catch (error) {
      return next(error);
    }
  };


  // Obter um cliente específico por ID (com perfil)
  getClientById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      if (!id) {
        return res.status(400).json({ success: false, message: "ID é obrigatório" });
      }
      const client = await clientService.getClientById(id);
      if (!client) {
        return res.status(404).json({ success: false, message: "Cliente não encontrado" });
      }
      // ✅ Usar helper function
      return res.json({ success: true, data: mapClientResponse(client) });
    } catch (error) {
      return next(error);
    }
  };


  // Atualizar dados do usuário e do perfil de cliente
  updateClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      if (!id) {
        return res.status(400).json({ success: false, message: "ID é obrigatório" });
      }
      // Atualiza dados do perfil de cliente
      // Separa campos de client e user
      const clientFields = [
        'phone', 'companyName', 'industry', 'companySize', 'address', 'jobTitle', 'department', 'budget',
        'preferredCategories', 'eventTypes', 'communicationPrefs', 'totalBookings', 'totalSpent', 'averageRating', 'completedBookings'
      ];
      const userFields = ['name', 'email', 'role', 'bio', 'location', 'avatarUrl', 'isActive'];

      const clientData: Record<string, unknown> = {};
      const userData: Record<string, unknown> = {};
      for (const key in req.body) {
        if (clientFields.includes(key)) clientData[key] = req.body[key];
        if (userFields.includes(key)) userData[key] = req.body[key];
      }

      // ✅ Usar transação atômica para garantir consistência
      await prisma.$transaction(async (tx) => {
        let updatedClient: Client | null = null;
        
        // Atualizar dados do cliente
        if (Object.keys(clientData).length > 0) {
          updatedClient = await tx.client.update({
            where: { id },
            data: clientData,
          });
        } else {
          updatedClient = await tx.client.findUnique({ where: { id } });
        }

        if (!updatedClient) {
          throw new NotFoundError('Cliente não encontrado');
        }

        // Se houver dados de usuário, atualiza também
        if (Object.keys(userData).length > 0 && updatedClient.userId) {
          await tx.user.update({
            where: { id: updatedClient.userId },
            data: userData
          });
        }
      });
      
      // Retorna o cliente atualizado com dados do usuário
      const client = await clientService.getClientById(id);
      if (!client) {
        return res.status(404).json({ success: false, message: "Cliente não encontrado" });
      }
      // ✅ Usar helper function
      return res.json({ success: true, data: mapClientResponse(client) });
    } catch (error) {
      return next(error);
    }
  };


  // Deletar um cliente (user + perfil)
  deleteClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      if (!id) {
        return res.status(400).json({ success: false, message: "ID é obrigatório" });
      }

      // Buscar cliente para obter o userId antes de deletar
      const client = await prisma.client.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!client) {
        return res.status(404).json({ success: false, message: "Cliente não encontrado" });
      }

      // Executar limpeza em transação para evitar erros de constraint (FK)
      await prisma.$transaction(async (tx) => {
        // 1. Limpar favoritos
        await tx.clientFavorite.deleteMany({ where: { clientId: id } });
        
        // 2. Limpar notificações do cliente
        await tx.notification.deleteMany({ where: { clientId: id } });

        // 3. Tratar Reservas (Bookings) - Deletar tudo relacionado
        const bookings = await tx.booking.findMany({ where: { clientId: id } });
        const bIds = bookings.map(b => b.id);
        
        if (bIds.length > 0) {
          await tx.bookingAttachment.deleteMany({ where: { bookingId: { in: bIds } } });
          await tx.bookingAuditLog.deleteMany({ where: { bookingId: { in: bIds } } });
          await tx.eventCollaborator.deleteMany({ where: { bookingId: { in: bIds } } });
          await tx.message.deleteMany({ where: { bookingId: { in: bIds } } });
          await tx.review.deleteMany({ where: { bookingId: { in: bIds } } });
          await tx.tVDevice.deleteMany({ where: { bookingId: { in: bIds } } });
          
          await tx.booking.deleteMany({ where: { clientId: id } });
        }

        // 4. Se o usuário for apenas um CLIENT, limpar seus dados de usuário também
        if (client.userId && client.user?.role === 'CLIENT') {
          // Limpar Bookings onde ele é o criador (mas não necessariamente o cliente)
          await tx.booking.deleteMany({ where: { creatorId: client.userId } });
          
          // Limpar outras relações do usuário
          await tx.notification.deleteMany({ where: { userId: client.userId } });
          await tx.chatParticipant.deleteMany({ where: { userId: client.userId } });
          await tx.bookingAuditLog.deleteMany({ where: { userId: client.userId } });
          await tx.message.deleteMany({ 
            where: { OR: [{ senderId: client.userId }, { recipientId: client.userId }] } 
          });

          // Deletar o perfil do cliente primeiro (devido à relação 1:1)
          await tx.client.delete({ where: { id } });
          // Deletar o usuário
          await tx.user.delete({ where: { id: client.userId } });
        } else {
          // Se for admin ou outro role, deletar apenas o perfil de cliente
          await tx.client.delete({ where: { id } });
        }
      });

      logger.info(`Cliente deletado com sucesso: ${id}`);
      return res.status(200).json({ success: true, message: 'Cliente removido com sucesso' });
    } catch (error) {
      logger.error('Erro ao deletar cliente: ' + String(error));
      return next(error);
    }
  };

  // Gerenciamento de usuários
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const users = await userService.getAllUsers({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
      });
      res.json({ success: true, data: users });
    } catch (error) {
      logger.error('Erro ao buscar usuários: ' + String(error));
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const user = await userService.getUserById(Number(id));
      if (!user) {
        return res.status(404).json({ success: false, message: "Usuário não encontrado" });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      logger.error('Erro ao buscar usuário: ' + String(error));
      next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { role } = req.body;
      
      const user = await userService.updateUserRole(Number(id), role);
      res.json({ success: true, data: user });
    } catch (error) {
      logger.error('Erro ao atualizar role do usuário: ' + String(error));
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      // O ID é um CUID (string), remover a conversão para Number que causava erro NaN
      await userService.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      logger.error('Erro ao deletar usuário: ' + String(error));
      next(error);
    }
  }

  // Dashboard e estatísticas
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const dashboardStats = await bookingService.getDashboardStats();
      const stats = {
        totalUsers: await userService.getTotalUsers(),
        totalBookings: dashboardStats.totalBookings,
        totalEquipments: await equipmentService.getTotalEquipments(),
        recentBookings: await bookingService.getAllBookings({ eventDateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }),
      };
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Erro ao buscar dashboard: ' + String(error));
      next(error);
    }
  }

  // Gerenciamento de reservas
  async getAllBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const { status, startDate, endDate } = req.query;
      const normalizedStatus =
        typeof status === 'string' && Object.values(BookingStatus).includes(status as BookingStatus)
          ? (status as BookingStatus)
          : undefined;
      
      const filters = {
        status: normalizedStatus,
        eventDateFrom: startDate ? new Date(startDate as string) : undefined,
        eventDateTo: endDate ? new Date(endDate as string) : undefined,
      };
      
      const [bookings, total] = await Promise.all([
        bookingService.getAllBookings(filters),
        bookingService.countBookings(filters)
      ]);
      
      // Aplicar paginação manualmente (idealmente seria no service)
      const start = (page - 1) * limit;
      const paginatedBookings = bookings.slice(start, start + limit);
      
      res.json({
        success: true,
        data: paginatedBookings,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar reservas: ' + String(error));
      next(error);
    }
  }

  async updateBookingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { status } = req.body;
      
      const booking = await bookingService.updateBookingStatus(id, status);
      res.json({ success: true, data: booking });
    } catch (error) {
      logger.error('Erro ao atualizar status da reserva: ' + String(error));
      next(error);
    }
  }

  // Marca o email do usuário como verificado (apenas admin)
  async verifyUserEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }; // user id
      if (!id) return res.status(400).json({ success: false, message: 'ID do usuário é obrigatório' });

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

      if (user.verified) return res.status(200).json({ success: true, message: 'E-mail já verificado' });

      const updated = await prisma.user.update({ where: { id }, data: { verified: true } });
      return res.json({ success: true, data: { user: { id: updated.id, email: updated.email, verified: updated.verified } } });
    } catch (error) {
      logger.error('Erro ao verificar email de usuário: ' + String(error));
      next(error);
    }
  }

  // Reenvia e-mail de verificação: gera token e envia para o usuário
  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }; // user id
      if (!id) return res.status(400).json({ success: false, message: 'ID do usuário é obrigatório' });

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      if (user.verified) return res.status(400).json({ success: false, message: 'E-mail já verificado' });

      const token = crypto.randomBytes(20).toString('hex');

      const updated = await prisma.user.update({
        where: { id },
        data: { passwordResetToken: token, passwordResetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

      try {
        await EmailService.sendVerificationEmail(updated.email, verifyUrl);
      } catch (e) {
        logger.warn('Falha ao enviar e-mail de verificação: ' + String(e));
      }

      return res.json({ success: true, message: 'E-mail de verificação reenviado' });
    } catch (error) {
      logger.error('Erro ao reenviar verificação: ' + String(error));
      next(error);
    }
  }
}
