import { Router } from 'express';
import {
  getMyChats,
  getChatMessages,
  sendMessage,
  createSupportChat,
} from '../controllers/collaboratorMessagesController';
import { authMiddleware, adminOrCollaborator } from '../middlewares/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas de mensagens para colaboradores
router.get('/chats', adminOrCollaborator, getMyChats);
router.post('/chats/support', adminOrCollaborator, createSupportChat);
router.get('/chats/:chatId/messages', adminOrCollaborator, getChatMessages);
router.post('/chats/:chatId/messages', adminOrCollaborator, sendMessage);

export default router;