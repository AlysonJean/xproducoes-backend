import { createSafeRouter } from '../middlewares/safeRouter';
import {
  getMyChats,
  getChatMessages,
  sendMessage,
  createSupportChat,
  getOrCreateBookingChat,
} from '../controllers/collaboratorMessagesController';
import { authenticate } from "../middlewares/unifiedAuth";

const router = createSafeRouter();

// Todas as rotas requerem autenticação — o controle de acesso por chat é feito por
// participação (ChatParticipant), não por papel: colaboradores, admins e clientes
// (donos da própria reserva) usam as mesmas rotas. Ver getOrCreateBookingChat/getChatMessages.
router.use(authenticate);

router.get('/chats', getMyChats);
router.post('/chats/support', createSupportChat);
router.get('/chats/:chatId/messages', getChatMessages);
router.post('/chats/:chatId/messages', sendMessage);
router.post('/chats/booking/:bookingId', getOrCreateBookingChat);

export default router;