import { createSafeRouter } from '../middlewares/safeRouter';
import sponsorController from '../controllers/sponsorController';
import { authenticate } from '../middlewares/unifiedAuth';
import multer from 'multer';

// Multer in memory for Cloudinary upload
const upload = multer({ storage: multer.memoryStorage() });

const router = createSafeRouter();

// Apply auth to all routes
router.use(authenticate);

import { validateBody, validateId } from '../config/validation';
import { sponsorCreateSchema } from '../schemas/cms.schema';

router.post('/', upload.single('logo'), validateBody(sponsorCreateSchema.pick({ name: true })), sponsorController.create);
router.get('/', sponsorController.list);
router.delete('/:id', validateId(), sponsorController.delete);

export default router;
