// Configuração do Socket.IO para Chat em Tempo Real
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MessageType } from '@prisma/client';
import { prisma } from './prisma';
import { config } from './environment';
import logger from './logger';

let io: SocketIOServer | null = null;

// Mapa para rastrear usuários conectados
const connectedUsers = new Map<string, string>(); // userId -> socketId

export function initializeSocket(server: any) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Middleware de autenticação
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Token de autenticação necessário'));
      }

      // Verificar token JWT
      const decoded = jwt.verify(token as string, config.jwtSecret) as any;

      // Buscar usuário no banco
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true }
      });

      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      // Anexar dados do usuário ao socket
      socket.data.user = user;
      next();
    } catch (error) {
      logger.error({ err: error }, 'Erro na autenticação do socket');
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    logger.info({ socketId: socket.id, userId: user.id, userName: user.name }, 'Cliente conectado');

    // Registrar usuário conectado
    connectedUsers.set(user.id, socket.id);

    // Entrar na sala do usuário
    socket.join(`user_${user.id}`);

    // Eventos de chat
    socket.on('join_chat', (chatId: string) => {
      socket.join(`chat_${chatId}`);
      logger.info({ userName: user.name, chatId }, 'Usuário entrou no chat');
    });

    socket.on('leave_chat', (chatId: string) => {
      socket.leave(`chat_${chatId}`);
      logger.info({ userName: user.name, chatId }, 'Usuário saiu do chat');
    });

    socket.on('send_message', async (data: {
      chatId: string;
      content: string;
      messageType: 'text' | 'image' | 'file';
      fileUrl?: string;
      fileName?: string;
    }) => {
      try {
        // Salvar mensagem no banco
        const message = await prisma.chatMessage.create({
          data: {
            chatId: data.chatId,
            senderId: user.id,
            content: data.content,
            messageType: data.messageType as MessageType,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
          },
          include: {
            sender: {
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        });

        // Emitir para todos no chat
        io?.to(`chat_${data.chatId}`).emit('new_message', message);

        // Notificar participantes do chat (exceto o remetente)
        const chat = await prisma.chat.findUnique({
          where: { id: data.chatId },
          include: { participants: true }
        });

        if (chat) {
          const participants = chat.participants.filter(p => p.userId !== user.id);
          participants.forEach(participant => {
            io?.to(`user_${participant.userId}`).emit('chat_notification', {
              chatId: data.chatId,
              message: message,
              sender: user.name
            });
          });
        }

      } catch (error) {
        logger.error({ err: error }, 'Erro ao enviar mensagem');
        socket.emit('message_error', { error: 'Erro ao enviar mensagem' });
      }
    });

    socket.on('typing_start', (chatId: string) => {
      socket.to(`chat_${chatId}`).emit('user_typing', {
        userId: user.id,
        userName: user.name,
        chatId
      });
    });

    socket.on('typing_stop', (chatId: string) => {
      socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
        userId: user.id,
        userName: user.name,
        chatId
      });
    });

    socket.on('mark_as_read', async (data: { chatId: string; messageId: string }) => {
      try {
        await prisma.chatMessageRead.create({
          data: {
            messageId: data.messageId,
            userId: user.id,
            chatId: data.chatId
          }
        });

        // Notificar outros participantes
        socket.to(`chat_${data.chatId}`).emit('message_read', {
          messageId: data.messageId,
          userId: user.id,
          chatId: data.chatId
        });
      } catch (error) {
        logger.error({ err: error }, 'Erro ao marcar mensagem como lida');
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id, userName: user.name }, 'Cliente desconectado');
      connectedUsers.delete(user.id);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO não foi inicializado');
  }
  return io;
}

export function getConnectedUsers() {
  return connectedUsers;
}

export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId);
}
