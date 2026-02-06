import { Router } from 'express';
import sponsorController from '../controllers/sponsorController';
import { authenticate } from '../middlewares/unifiedAuth';
import multer from 'multer';

// Multer in memory for Cloudinary upload
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Apply auth to all routes
router.use(authenticate);

router.post('/', upload.single('logo'), sponsorController.create);
router.get('/', sponsorController.list);
router.delete('/:id', sponsorController.delete);

export default router;
