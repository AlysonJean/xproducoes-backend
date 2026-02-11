
import { createSafeRouter } from '../middlewares/safeRouter';
import * as googleController from '../controllers/googleController';
import { authenticate } from '../middlewares/unifiedAuth';

const googleRoutes = createSafeRouter();

// Iniciar conexão (gera URL)
googleRoutes.get('/connect', authenticate, googleController.connect);

// Callback do Google
googleRoutes.get('/callback', googleController.callback);

// Desconectar conta
googleRoutes.post('/disconnect', authenticate, googleController.disconnect);

// Sincronizar reserva específica
googleRoutes.post('/bookings/:id/sync', authenticate, googleController.syncBooking);

export default googleRoutes;
