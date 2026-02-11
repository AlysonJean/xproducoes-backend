import { createSafeRouter } from '../middlewares/safeRouter';
import { getAppSettings, updateAppSettings } from '../controllers/settingsController';

const router = createSafeRouter();

// Rotas para configurações da aplicação
router.get('/', getAppSettings);
router.put('/', updateAppSettings);

export default router;