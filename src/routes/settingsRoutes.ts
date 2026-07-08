import { createSafeRouter } from '../middlewares/safeRouter.js';
import { getAppSettings, updateAppSettings } from '../controllers/settingsController.js';
import { authenticate, requireAdmin } from '../middlewares/unifiedAuth.js';

const router = createSafeRouter();

// Leitura pública (branding exibido no site); escrita restrita a admin.
router.get('/', getAppSettings);
router.put('/', authenticate, requireAdmin, updateAppSettings);

export default router;