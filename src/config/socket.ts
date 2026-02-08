// Configuração do Socket.IO para Chat em Tempo Real
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { MessageType } from '@prisma/client';
import { prisma } from './prisma';
import { config } from './environment';
import logger from './logger';
import IORedis from 'ioredis';

let io: SocketIOServer | null = null;
let pubClient: IORedis | null = null;
let subClient: IORedis | null = null;

// Chave do Redis para status global (userId -> socketId)
const REDIS_ONLINE_KEY = 'xproducoes:online_users';

export async function initializeSocket(server: any) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Configurar Redis Adapter para Escalabilidade (Multinode)
  if (process.env.REDIS_URL) {
    try {
      pubClient = new IORedis(process.env.REDIS_URL);
      subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis Adapter configurado');
    } catch (error) {
      logger.error({ err: error }, 'Erro ao conectar Redis para Socket.IO Adapter');
    }
  }

  // Middleware de autenticação
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next();
      }

      const decoded = jwt.verify(token as string, config.jwtSecret) as any;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true }
      });

      if (user) {
        socket.data.user = user;
      }
      
      next();
    } catch (error) {
      logger.warn({ err: error }, 'Falha na autenticação do socket, conectando como público');
      next();
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    
    if (user) {
      logger.info({ socketId: socket.id, userId: user.id, userName: user.name }, 'Cliente autenticado conectado');
      
      // Registrar no Redis se disponível (para múltiplos servidores entenderem quem está online)
      if (pubClient) {
        await pubClient.hset(REDIS_ONLINE_KEY, user.id, socket.id);
      }
      
      socket.join(`user_${user.id}`);
    } else {
      logger.info({ socketId: socket.id }, 'Dispositivo público conectado');
    }

    socket.on('join', (room: string) => {
      if (room.startsWith('wall:') || room.startsWith('event:')) {
        socket.join(room);
        logger.info({ socketId: socket.id, room }, 'Dispositivo entrou na sala do mural');
      } else if (user) {
        socket.join(room);
      }
    });

    socket.on('join_chat', (chatId: string) => {
      if (!user) return;
      socket.join(`chat_${chatId}`);
      logger.info({ userName: user.name, chatId }, 'Usuário entrou no chat');
    });

    socket.on('leave_chat', (chatId: string) => {
      if (!user) return;
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
      if (!user) {
        return socket.emit('message_error', { error: 'Não autenticado' });
      }

      try {
        const message = await prisma.chatMessage.create({
          data: {
            chatId: data.chatId,
            senderId: user.id,
            content: data.content,
            messageType: data.messageType as any,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
          },
          include: {
            sender: {
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        });

        io?.to(`chat_${data.chatId}`).emit('new_message', message);

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
      if (!user) return;
      socket.to(`chat_${chatId}`).emit('user_typing', {
        userId: user.id,
        userName: user.name,
        chatId
      });
    });

    socket.on('typing_stop', (chatId: string) => {
      if (!user) return;
      socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
        userId: user.id,
        userName: user.name,
        chatId
      });
    });

    socket.on('mark_as_read', async (data: { chatId: string; messageId: string }) => {
      if (!user) return;
      try {
        await prisma.chatMessageRead.create({
          data: {
            messageId: data.messageId,
            userId: user.id,
            chatId: data.chatId
          }
        });

        socket.to(`chat_${data.chatId}`).emit('message_read', {
          messageId: data.messageId,
          userId: user.id,
          chatId: data.chatId
        });
      } catch (error) {
        logger.error({ err: error }, 'Erro ao marcar mensagem como lida');
      }
    });

    socket.on('disconnect', async () => {
      if (user) {
        logger.info({ socketId: socket.id, userName: user.name }, 'Cliente autenticado desconectado');
        if (pubClient) {
          await pubClient.hdel(REDIS_ONLINE_KEY, user.id);
        }
      } else {
        logger.info({ socketId: socket.id }, 'Dispositivo público desconectado');
      }
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

export async function isUserOnline(userId: string): Promise<boolean> {
  if (pubClient) {
    const res = await pubClient.hexists(REDIS_ONLINE_KEY, userId);
    return res === 1;
  }
  // Fallback se Redis não estiver ativo, não temos como saber em multinode sem Redis
  return false;
}
