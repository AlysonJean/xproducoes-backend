import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import logger from "../config/logger";
import { getSocketIO } from '../config/socket';
import { getOrCreateEventChat } from '../services/chatService';


export class CollaboratorMessagesController {
  // Buscar chats do colaborador
  async getMyChats(req: Request, res: Response) {
    try {
      const userId = req.userId as string;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      const chats = await prisma.chat.findMany({
        where: {
          participants: {
            some: {
              userId: userId
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true
                }
              }
            }
          },
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true
                }
              },
              reads: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      // Adicionar informações sobre mensagens não lidas
      const chatsWithUnread = await Promise.all(
        chats.map(async (chat) => {
          const unreadCount = await prisma.chatMessage.count({
            where: {
              chatId: chat.id,
              senderId: {
                not: userId
              },
              reads: {
                none: {
                  userId: userId
                }
              }
            }
          });

          return {
            ...chat,
            unreadCount
          };
        })
      );

      return res.json({ success: true, data: chatsWithUnread });
    } catch (error) {
      logger.error({obj:error}, 'Erro ao buscar chats:');
      return res.status(500).json({ success: false, message: 'Erro ao buscar chats' });
    }
  }

  // Buscar mensagens de um chat específico
  async getChatMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params as { chatId: string };
      const userId = req.userId as string;
      const { page = '1', limit = '20' } = req.query;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Verificar se o usuário é participante do chat
      const chatParticipant = await prisma.chatParticipant.findFirst({
        where: {
          chatId: chatId,
          userId: userId
        }
      });

      if (!chatParticipant) {
        return res.status(403).json({ success: false, message: 'Acesso negado ao chat' });
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const messages = await prisma.chatMessage.findMany({
        where: {
          chatId: chatId
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          },
          reads: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: skip,
        take: limitNum
      });

      const totalMessages = await prisma.chatMessage.count({
        where: {
          chatId: chatId
        }
      });

      // Marcar mensagens como lidas
      await prisma.chatMessageRead.createMany({
        data: messages
          .filter(msg => msg.senderId !== userId)
          .map(msg => ({
            messageId: msg.id,
            userId: userId,
            chatId: chatId
          })),
        skipDuplicates: true
      });

      return res.json({
        success: true,
        data: {
          messages: messages.reverse(), // Retornar em ordem cronológica
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalMessages,
            hasMore: skip + limitNum < totalMessages
          }
        }
      });
    } catch (error) {
      logger.error({obj:error}, 'Erro ao buscar mensagens:');
      return res.status(500).json({ success: false, message: 'Erro ao buscar mensagens' });
    }
  }

  // Enviar mensagem
  async sendMessage(req: Request, res: Response) {
    try {
      const { chatId } = req.params as { chatId: string };
      const { content, messageType = 'TEXT' } = req.body;
      const userId = req.userId as string;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      if (!content || content.trim() === '') {
        return res.status(400).json({ success: false, message: 'Conteúdo da mensagem é obrigatório' });
      }

      // Verificar se o usuário é participante do chat
      const chatParticipant = await prisma.chatParticipant.findFirst({
        where: {
          chatId: chatId,
          userId: userId
        }
      });

      if (!chatParticipant) {
        return res.status(403).json({ success: false, message: 'Acesso negado ao chat' });
      }

      const message = await prisma.chatMessage.create({
        data: {
          chatId: chatId,
          senderId: userId,
          content: content.trim(),
          messageType: messageType
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          },
          reads: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Atualizar timestamp do chat
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() }
      });

      // Emitir via Socket.IO para tempo real
      try {
        const io = getSocketIO();
        io.to(`chat_${chatId}`).emit('new_message', message);

        // Notificar outros participantes (fora do chat atual)
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: { participants: true }
        });

        if (chat) {
          const others = chat.participants.filter(p => p.userId !== userId);
          others.forEach(participant => {
            io.to(`user_${participant.userId}`).emit('chat_notification', {
              chatId,
              message,
              sender: message.sender.name
            });
          });
        }
      } catch (_e) {
        logger.warn('Falha ao emitir socket events no chat');
      }

      return res.json({ success: true, data: message });
    } catch (error) {
      logger.error({obj:error}, 'Erro ao enviar mensagem:');
      return res.status(500).json({ success: false, message: 'Erro ao enviar mensagem' });
    }
  }

  // Criar chat com administrador
  async createSupportChat(req: Request, res: Response) {
    try {
      const userId = req.userId as string;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Buscar administradores
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN'
        },
        select: {
          id: true
        }
      });

      if (admins.length === 0) {
        return res.status(404).json({ success: false, message: 'Nenhum administrador encontrado' });
      }

      // Verificar se já existe um chat de suporte
      const existingChat = await prisma.chat.findFirst({
        where: {
          type: 'SUPPORT',
          participants: {
            every: {
              userId: {
                in: [userId, ...admins.map(a => a.id)]
              }
            }
          }
        }
      });

      if (existingChat) {
        return res.json({ success: true, data: existingChat });
      }

      // Criar novo chat de suporte
      const chat = await prisma.chat.create({
        data: {
          name: 'Suporte',
          type: 'SUPPORT',
          participants: {
            create: [
              { userId: userId, role: 'MEMBER' },
              ...admins.map(admin => ({ userId: admin.id, role: 'ADMIN' as const }))
            ]
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      });

      return res.json({ success: true, data: chat });
    } catch (error) {
      logger.error({obj:error}, 'Erro ao criar chat de suporte:');
      return res.status(500).json({ success: false, message: 'Erro ao criar chat de suporte' });
    }
  }

  // Buscar (ou criar) o chat do evento de uma reserva — usado pelo cliente para conversar
  // sobre o próprio orçamento/reserva, sem depender de a reserva já estar CONFIRMED.
  async getOrCreateBookingChat(req: Request, res: Response) {
    try {
      const { bookingId } = req.params as { bookingId: string };
      const userId = req.userId as string;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
      }

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, creatorId: true }
      });

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Reserva não encontrada' });
      }

      const isOwner = booking.creatorId === userId;
      const staffRoles = ['ADMIN', 'MANAGER', 'COLLABORATOR'];
      const isStaff = typeof req.userRole === 'string' && staffRoles.includes(req.userRole);

      if (!isOwner && !isStaff) {
        return res.status(403).json({ success: false, message: 'Acesso negado a esta reserva' });
      }

      const chat = await getOrCreateEventChat(bookingId);
      if (!chat) {
        return res.status(404).json({ success: false, message: 'Reserva não encontrada' });
      }

      return res.json({ success: true, data: chat });
    } catch (error) {
      logger.error({ obj: error }, 'Erro ao buscar/criar chat da reserva:');
      return res.status(500).json({ success: false, message: 'Erro ao buscar/criar chat da reserva' });
    }
  }
}

// Instância única do controller
const collaboratorMessagesController = new CollaboratorMessagesController();

// Exportar métodos do controller
export const {
  getMyChats,
  getChatMessages,
  sendMessage,
  createSupportChat,
  getOrCreateBookingChat,
} = collaboratorMessagesController;
