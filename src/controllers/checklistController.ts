import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import logger from '../config/logger';
import { ChecklistItemStatus, ChecklistAssignmentStatus, ChecklistStatus, ChecklistType, Prisma } from '@prisma/client';

const isEnumValue = <T extends string>(value: unknown, enumObject: Record<string, T>): value is T => {
  return typeof value === 'string' && Object.values(enumObject).includes(value as T);
};

// ================================
// CONTROLLER DE CHECKLIST
// ================================

export class ChecklistController {
  // Buscar checklists do colaborador atual
  getMyChecklists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { status, page = 1, limit = 10 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const normalizedStatus = isEnumValue(status, ChecklistAssignmentStatus) ? status : undefined;

      // Buscar checklists atribuídos ao usuário
      const assignments = await prisma.checklistAssignment.findMany({
        where: {
          assignedToId: userId,
          ...(normalizedStatus && { status: normalizedStatus }),
        },
        include: {
          checklist: {
            include: {
              items: {
                orderBy: { order: 'asc' },
              },
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      });

      const total = await prisma.checklistAssignment.count({
        where: {
          assignedToId: userId,
          ...(normalizedStatus && { status: normalizedStatus }),
        },
      });

      res.json({
        data: assignments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao buscar checklists');
      return next(error);
    }
  }

  // Buscar checklist específico
  getChecklist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const userId = req.user!.id;

      const assignment = await prisma.checklistAssignment.findFirst({
        where: {
          checklistId: id,
          assignedToId: userId,
        },
        include: {
          checklist: {
            include: {
              items: {
                orderBy: { order: 'asc' },
                include: {
                  completedBy: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Checklist não encontrado' });
      }

      res.json({ success: true, data: assignment });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao buscar checklist');
      return next(error);
    }
  }

  // Atualizar status de um item do checklist
  updateChecklistItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { checklistId, itemId } = req.params as { checklistId: string; itemId: string };
      const { status, notes } = req.body;
      const userId = req.user!.id;

      // Verificar se o usuário tem acesso ao checklist
      const assignment = await prisma.checklistAssignment.findFirst({
        where: {
          checklistId,
          assignedToId: userId,
        },
      });

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Checklist não encontrado ou sem permissão' });
      }

      const updateData: Prisma.ChecklistItemUpdateInput = {
        status: status as ChecklistItemStatus,
        updatedAt: new Date(),
      };

      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completedBy = { connect: { id: userId } };
      } else if (status === 'PENDING') {
        updateData.completedAt = null;
        updateData.completedBy = { disconnect: true };
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const updatedItem = await prisma.checklistItem.update({
        where: { id: itemId },
        data: updateData,
        include: {
          completedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Verificar se todos os itens obrigatórios estão completos
      const checklist = await prisma.checklist.findUnique({
        where: { id: checklistId },
        include: {
          items: true,
          assignments: {
            where: { assignedToId: userId },
          },
        },
      });

      if (checklist) {
        const requiredItems = checklist.items.filter(item => item.isRequired);
        const completedRequiredItems = requiredItems.filter(item => item.status === 'COMPLETED');

        if (requiredItems.length > 0 && requiredItems.length === completedRequiredItems.length) {
          // Marcar assignment como completo se todos os itens obrigatórios estiverem feitos
          await prisma.checklistAssignment.update({
            where: { id: assignment.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
        }
      }

      res.json({ success: true, data: updatedItem });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao atualizar item do checklist');
      return next(error);
    }
  }

  // Atualizar status do assignment do checklist
  updateChecklistStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { status, notes } = req.body;
      const userId = req.user!.id;

      const assignment = await prisma.checklistAssignment.findFirst({
        where: {
          checklistId: id,
          assignedToId: userId,
        },
      });

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Checklist não encontrado ou sem permissão' });
      }

      const updateData: Prisma.ChecklistAssignmentUpdateInput = {
        status: status as ChecklistAssignmentStatus,
        updatedAt: new Date(),
      };

      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (status === 'IN_PROGRESS') {
        updateData.completedAt = null;
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const updatedAssignment = await prisma.checklistAssignment.update({
        where: { id: assignment.id },
        data: updateData,
        include: {
          checklist: {
            include: {
              items: {
                orderBy: { order: 'asc' },
              },
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json({ success: true, data: updatedAssignment });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao atualizar status do checklist');
      return next(error);
    }
  }

  // ================================
  // MÉTODOS PARA ADMINISTRADORES
  // ================================

  // Criar novo checklist
  createChecklist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, type, items, assignedToIds, dueDate, priority } = req.body;
      const createdById = req.user!.id;

      // Criar checklist
      const checklist = await prisma.checklist.create({
        data: {
          title,
          description,
          type: type || 'GENERAL',
          createdById,
          items: {
            create: items?.map((item: { title: string; description?: string; order?: number; isRequired?: boolean }, index: number) => ({
              title: item.title,
              description: item.description,
              order: item.order || index,
              isRequired: item.isRequired || false,
            })) || [],
          },
        },
        include: {
          items: true,
        },
      });

      // Criar assignments se especificado
      if (assignedToIds && assignedToIds.length > 0) {
        await prisma.checklistAssignment.createMany({
          data: assignedToIds.map((assignedToId: string) => ({
            checklistId: checklist.id,
            assignedToId,
            assignedById: createdById,
            dueDate: dueDate ? new Date(dueDate) : null,
            priority: priority || 'MEDIUM',
          })),
        });
      }

      res.status(201).json({ success: true, data: checklist });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao criar checklist');
      return next(error);
    }
  }

  // Buscar todos os checklists (admin)
  getAllChecklists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, type, assignedTo, page = 1, limit = 10 } = req.query;
      const normalizedStatus = isEnumValue(status, ChecklistStatus) ? status : undefined;
      const normalizedType = isEnumValue(type, ChecklistType) ? type : undefined;

      const skip = (Number(page) - 1) * Number(limit);

      const checklists = await prisma.checklist.findMany({
        where: {
          ...(normalizedStatus && { status: normalizedStatus }),
          ...(normalizedType && { type: normalizedType }),
        },
        include: {
          items: {
            orderBy: { order: 'asc' },
          },
          assignments: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              assignedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            ...(assignedTo && {
              where: { assignedToId: assignedTo as string },
            }),
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      });

      const total = await prisma.checklist.count({
        where: {
          ...(normalizedStatus && { status: normalizedStatus }),
          ...(normalizedType && { type: normalizedType }),
        },
      });

      res.json({
        success: true,
        data: checklists,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao buscar checklists');
      return next(error);
    }
  }

  // Atualizar checklist
  updateChecklist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { title, description, type, status, items } = req.body;

      const checklist = await prisma.checklist.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(type && { type }),
          ...(status && { status }),
          updatedAt: new Date(),
        },
        include: {
          items: {
            orderBy: { order: 'asc' },
          },
          assignments: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Atualizar itens se fornecidos
      if (items) {
        // Remover itens existentes
        await prisma.checklistItem.deleteMany({
          where: { checklistId: id },
        });

        // Criar novos itens
        if (items.length > 0) {
          await prisma.checklistItem.createMany({
            data: items.map((item: { title: string; description?: string; order?: number; isRequired?: boolean }, index: number) => ({
              checklistId: id,
              title: item.title,
              description: item.description,
              order: item.order || index,
              isRequired: item.isRequired || false,
            })),
          });
        }
      }

      res.json({ success: true, data: checklist });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao atualizar checklist');
      return next(error);
    }
  }

  // Deletar checklist
  deleteChecklist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };

      await prisma.checklist.delete({
        where: { id },
      });

      res.json({ success: true, message: 'Checklist deletado com sucesso' });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao deletar checklist');
      return next(error);
    }
  }

  // Atribuir checklist a usuários
  assignChecklist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { checklistId } = req.params as { checklistId: string };
      const { assignedToIds, dueDate, priority, notes } = req.body;
      const assignedById = req.user!.id;

      const assignments = await prisma.checklistAssignment.createMany({
        data: assignedToIds.map((assignedToId: string) => ({
          checklistId,
          assignedToId,
          assignedById,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: priority || 'MEDIUM',
          notes,
        })),
        skipDuplicates: true,
      });

      res.status(201).json({ success: true, data: assignments });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao atribuir checklist');
      return next(error);
    }
  }

  // Remover atribuição de checklist
  unassignChecklist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { checklistId, userId } = req.params as { checklistId: string; userId: string };

      await prisma.checklistAssignment.deleteMany({
        where: {
          checklistId,
          assignedToId: userId,
        },
      });

      res.json({ success: true, message: 'Atribuição removida com sucesso' });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao remover atribuição');
      return next(error);
    }
  }
}
