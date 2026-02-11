import { createSafeRouter } from '../middlewares/safeRouter';
import { newsletterController } from '../controllers/newsletterController';
import { authenticate, requireAdmin } from '../middlewares/unifiedAuth';

const router = createSafeRouter();

import { validateBody } from '../config/validation';
import { newsletterSubscribeSchema } from '../schemas/cms.schema';

// Public route
router.post('/subscribe', validateBody(newsletterSubscribeSchema), newsletterController.subscribe);

// Admin routes
router.get('/subscribers', authenticate, requireAdmin, newsletterController.list);

export default router;
