import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ================================
// CONTROLLER DE CHECKLIST
// ================================

export class ChecklistController {
  // Buscar checklists do colaborador atual
  static async getMyChecklists(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { status, page = 1, limit = 10 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Buscar checklists atribuídos ao usuário
      const assignments = await prisma.checklistAssignment.findMany({
        where: {
          assignedToId: userId,
          ...(status && { status: status as any }),
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
          ...(status && { status: status as any }),
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
      console.error('Erro ao buscar checklists:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar checklist específico
  static async getChecklist(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
        return res.status(404).json({ error: 'Checklist não encontrado' });
      }

      res.json(assignment);
    } catch (error) {
      console.error('Erro ao buscar checklist:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar status de um item do checklist
  static async updateChecklistItem(req: Request, res: Response) {
    try {
      const { checklistId, itemId } = req.params;
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
        return res.status(404).json({ error: 'Checklist não encontrado ou sem permissão' });
      }

      const updateData: any = {
        status: status as any,
        updatedAt: new Date(),
      };

      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completedById = userId;
      } else if (status === 'PENDING') {
        updateData.completedAt = null;
        updateData.completedById = null;
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

      res.json(updatedItem);
    } catch (error) {
      console.error('Erro ao atualizar item do checklist:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar status do assignment do checklist
  static async updateChecklistStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user!.id;

      const assignment = await prisma.checklistAssignment.findFirst({
        where: {
          checklistId: id,
          assignedToId: userId,
        },
      });

      if (!assignment) {
        return res.status(404).json({ error: 'Checklist não encontrado ou sem permissão' });
      }

      const updateData: any = {
        status: status as any,
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

      res.json(updatedAssignment);
    } catch (error) {
      console.error('Erro ao atualizar status do checklist:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ================================
  // MÉTODOS PARA ADMINISTRADORES
  // ================================

  // Criar novo checklist
  static async createChecklist(req: Request, res: Response) {
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
            create: items?.map((item: any, index: number) => ({
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

      res.status(201).json(checklist);
    } catch (error) {
      console.error('Erro ao criar checklist:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar todos os checklists (admin)
  static async getAllChecklists(req: Request, res: Response) {
    try {
      const { status, type, assignedTo, page = 1, limit = 10 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const checklists = await prisma.checklist.findMany({
        where: {
          ...(status && { status: status as any }),
          ...(type && { type: type as any }),
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
          ...(status && { status: status as any }),
          ...(type && { type: type as any }),
        },
      });

      res.json({
        data: checklists,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Erro ao buscar checklists:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar checklist
  static async updateChecklist(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
            data: items.map((item: any, index: number) => ({
              checklistId: id,
              title: item.title,
              description: item.description,
              order: item.order || index,
              isRequired: item.isRequired || false,
            })),
          });
        }
      }

      res.json(checklist);
    } catch (error) {
      console.error('Erro ao atualizar checklist:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Deletar checklist
  static async deleteChecklist(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.checklist.delete({
        where: { id },
      });

      res.json({ message: 'Checklist deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar checklist:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atribuir checklist a usuários
  static async assignChecklist(req: Request, res: Response) {
    try {
      const { checklistId } = req.params;
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

      res.status(201).json(assignments);
    } catch (error) {
      console.error('Erro ao atribuir checklist:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Remover atribuição de checklist
  static async unassignChecklist(req: Request, res: Response) {
    try {
      const { checklistId, userId } = req.params;

      await prisma.checklistAssignment.deleteMany({
        where: {
          checklistId,
          assignedToId: userId,
        },
      });

      res.json({ message: 'Atribuição removida com sucesso' });
    } catch (error) {
      console.error('Erro ao remover atribuição:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}
