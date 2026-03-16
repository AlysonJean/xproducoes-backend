import { createSafeRouter } from '../middlewares/safeRouter.js';
import sponsorController from '../controllers/sponsorController.js';
import { authenticate } from '../middlewares/unifiedAuth.js';
import multer from 'multer';
import { validateBody, validateId } from '../config/validation.js';
import { sponsorCreateSchema } from '../schemas/cms.schema.js';

// Multer in memory for Cloudinary upload
const upload = multer({ storage: multer.memoryStorage() });

const router = createSafeRouter();

// Apply auth to all routes
router.use(authenticate);

router.post('/', upload.single('logo'), validateBody(sponsorCreateSchema.pick({ name: true })), sponsorController.create);
router.get('/', sponsorController.list);
router.delete('/:id', validateId(), sponsorController.delete);

export default router;
