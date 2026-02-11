import { createSafeRouter } from '../middlewares/safeRouter';
import {
  getMyChats,
  getChatMessages,
  sendMessage,
  createSupportChat,
} from '../controllers/collaboratorMessagesController';
import { authenticate, requireAdminOrCollaborator } from "../middlewares/unifiedAuth";

const router = createSafeRouter();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de mensagens para colaboradores
router.get('/chats', requireAdminOrCollaborator, getMyChats);
router.post('/chats/support', requireAdminOrCollaborator, createSupportChat);
router.get('/chats/:chatId/messages', requireAdminOrCollaborator, getChatMessages);
router.post('/chats/:chatId/messages', requireAdminOrCollaborator, sendMessage);

export default router;