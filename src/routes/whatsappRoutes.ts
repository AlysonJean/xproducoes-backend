
import { createSafeRouter } from '../middlewares/safeRouter';
import { authenticate, requireAdmin } from '../middlewares/unifiedAuth';
import { whatsappController } from '../controllers/whatsappController';

const whatsappRoutes = createSafeRouter();

whatsappRoutes.get('/status', authenticate, requireAdmin, (req, res) => whatsappController.getStatus(req, res));
whatsappRoutes.post('/logout', authenticate, requireAdmin, (req, res) => whatsappController.logout(req, res));
whatsappRoutes.post('/restart', authenticate, requireAdmin, (req, res) => whatsappController.restart(req, res));

export default whatsappRoutes;
