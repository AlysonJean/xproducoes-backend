// Configuração do Socket.IO para Chat em Tempo Real
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { MessageType } from '@prisma/client';
import { config } from './environment';
import { extractToken } from './cookies';
import { isTokenBlacklisted } from '../services/jwtBlacklistService';
import logger from './logger';
import IORedis from 'ioredis';
import { duplicateRedisClient } from './redis.js';

let io: SocketIOServer | null = null;
let pubClient: IORedis | null = null;

// Chave do Redis para status global (userId -> socketId)
const REDIS_ONLINE_KEY = 'xproducoes:online_users';

// O cliente envia messageType em minúsculo; o enum MessageType do Prisma é maiúsculo
const MESSAGE_TYPE_MAP: Record<'text' | 'image' | 'file', MessageType> = {
  text: MessageType.TEXT,
  image: MessageType.IMAGE,
  file: MessageType.FILE,
};

// Parser mínimo do cabeçalho Cookie (não usamos cookie-parser aqui: o handshake do
// Socket.IO só expõe o header cru, não um objeto já parseado como o Express faz).
export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const rawValue = pair.slice(idx + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(rawValue);
    } catch {
      result[key] = rawValue;
    }
  }
  return result;
}

export type SocketHandshakeLike = {
  auth?: { token?: string };
  query?: Record<string, unknown>;
  headers: { cookie?: string };
};

/**
 * Extrai e valida o access token de um handshake de socket.
 *
 * Achado corrigido aqui: o frontend nunca teve um token JWT legível por JS para colocar
 * em `auth.token` (a arquitetura é cookie httpOnly desde a migração de segurança) — ou
 * seja, TODA conexão de socket de um usuário logado sempre chegava sem token, caía no
 * `if (!token) return next()` e conectava como "público", nunca entrando na sala
 * `user_${id}`. Na prática, notificações de chat em tempo real (`chat_notification`) e
 * qualquer feature que dependa de `socket.data.user` nunca funcionavam para ninguém
 * logado. Corrigido lendo o cookie httpOnly do handshake (mesma fonte usada pelo resto
 * da API via config/cookies.ts#extractToken), com auth.token/query.token mantidos como
 * fallback explícito (compatibilidade com clientes que já passem um token diretamente).
 *
 * Também alinha o rigor com o middleware HTTP (unifiedAuth.ts#authenticate): antes, o
 * socket aceitava qualquer JWT válido — inclusive um refresh token, ou um access token
 * já revogado via blacklist — sem checar `type` nem blacklist.
 */
export async function resolveSocketTokenPayload(
  handshake: SocketHandshakeLike,
): Promise<{ userId: string; role: string } | null> {
  const cookies = parseCookieHeader(handshake.headers?.cookie);
  const rawQueryToken = handshake.query?.token;
  const headerToken =
    handshake.auth?.token || (Array.isArray(rawQueryToken) ? rawQueryToken[0] : (rawQueryToken as string | undefined));

  const { accessToken: token } = extractToken(cookies, typeof headerToken === 'string' ? `Bearer ${headerToken}` : undefined);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId?: string; role?: string; type?: string };
    if (!decoded.userId || decoded.type !== 'access') return null;
    if (await isTokenBlacklisted(token)) return null;
    return { userId: decoded.userId, role: decoded.role || '' };
  } catch {
    return null;
  }
}

export async function initializeSocket(server: HttpServer | HttpsServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Configurar Redis Adapter (apenas em multi-node; em instância única é desnecessário)
  // Use Redis adapter only when explicitly enabled (saves 2 connections on free tier)
  if (process.env.REDIS_URL && process.env.SOCKET_IO_REDIS_ADAPTER === 'true') {
    try {
      pubClient = duplicateRedisClient('socket-pub');
      const subClient = duplicateRedisClient('socket-sub');
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis Adapter configurado');
    } catch (error) {
      logger.warn({ err: error }, 'Falha ao configurar Redis Adapter — usando adapter padrão em memória');
    }
  }

  // Middleware de autenticação
  io.use(async (socket: Socket, next) => {
    try {
      const payload = await resolveSocketTokenPayload(socket.handshake);
      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, name: true, email: true, role: true }
        });

        if (user) {
          socket.data.user = user;
        }
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

    // Rate limiter: max 2 messages per second per connection (prevents chat flooding/DoS)
    const msgTimestamps: number[] = [];
    const MSG_RATE_LIMIT = 2;     // max messages
    const MSG_RATE_WINDOW = 1000; // per ms window

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

      // Enforce rate limit
      const now = Date.now();
      while (msgTimestamps.length > 0 && now - msgTimestamps[0] > MSG_RATE_WINDOW) {
        msgTimestamps.shift();
      }
      if (msgTimestamps.length >= MSG_RATE_LIMIT) {
        return socket.emit('message_error', { error: 'Muitas mensagens. Aguarde um momento.' });
      }
      msgTimestamps.push(now);

      try {
        const message = await prisma.chatMessage.create({
          data: {
            chatId: data.chatId,
            senderId: user.id,
            content: data.content,
            messageType: MESSAGE_TYPE_MAP[data.messageType],
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
