import { createSafeRouter } from '../middlewares/safeRouter';
import { ServiceController } from '../controllers/serviceController';
import { uploadSingle, processUpload } from '../middlewares/upload';
import { authenticate, optionalAuth } from '../middlewares/unifiedAuth';

import { validateBody, validateId } from '../config/validation';
import { serviceCreateSchema, serviceUpdateSchema } from '../schemas/service.schema';

const router = createSafeRouter();
const controller = new ServiceController();

// Public routes
router.get('/', optionalAuth, controller.list);
router.get('/:id', validateId(), controller.get);

// Protected admin routes
router.post('/', authenticate, uploadSingle('image'), processUpload, validateBody(serviceCreateSchema), controller.create);
router.put('/:id', authenticate, validateId(), uploadSingle('image'), processUpload, validateBody(serviceUpdateSchema), controller.update);
router.delete('/:id', authenticate, validateId(), controller.delete);
router.post('/:id/duplicate', authenticate, validateId(), controller.duplicate);

export default router;
