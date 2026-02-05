import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
import { uploadSingle, processUpload } from '../middlewares/upload';
import { authenticate } from '../middlewares/unifiedAuth';

const router = Router();
const controller = new ServiceController();

// Public routes
router.get('/', controller.list);
router.get('/:id', controller.get);

// Protected admin routes
router.post('/', authenticate, uploadSingle('image'), processUpload, controller.create);
router.put('/:id', authenticate, uploadSingle('image'), processUpload, controller.update);
router.delete('/:id', authenticate, controller.delete);
router.post('/:id/duplicate', authenticate, controller.duplicate);

export default router;
