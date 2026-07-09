import { createSafeRouter } from '../middlewares/safeRouter.js';
import { ServiceController } from '../controllers/serviceController.js';
import { uploadSingle, processUpload } from '../middlewares/upload.js';
import { authenticate, optionalAuth, adminOnly } from '../middlewares/unifiedAuth.js';

import { validateBody, validateId } from '../config/validation.js';
import { serviceCreateSchema, serviceUpdateSchema } from '../schemas/service.schema.js';

const router = createSafeRouter();
const controller = new ServiceController();

// Public routes
router.get('/', optionalAuth, controller.list);
router.get('/:id', validateId(), controller.get);

// Protected admin routes
router.post('/', authenticate, adminOnly, uploadSingle('image'), processUpload, validateBody(serviceCreateSchema), controller.create);
router.put('/:id', authenticate, adminOnly, validateId(), uploadSingle('image'), processUpload, validateBody(serviceUpdateSchema), controller.update);
router.delete('/:id', authenticate, adminOnly, validateId(), controller.delete);
router.post('/:id/duplicate', authenticate, adminOnly, validateId(), controller.duplicate);

export default router;
