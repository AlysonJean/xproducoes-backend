import { Router } from 'express';
import { newsletterController } from '../controllers/newsletterController';
import { authenticate, requireAdmin } from '../middlewares/unifiedAuth';

const router = Router();

// Public route
router.post('/subscribe', newsletterController.subscribe);

// Admin routes
router.get('/subscribers', authenticate, requireAdmin, newsletterController.list);

export default router;
