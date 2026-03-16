import { createSafeRouter } from '../middlewares/safeRouter.js';
import { getAppSettings, updateAppSettings } from '../controllers/settingsController.js';

const router = createSafeRouter();

// Rotas para configurações da aplicação
router.get('/', getAppSettings);
router.put('/', updateAppSettings);

export default router;