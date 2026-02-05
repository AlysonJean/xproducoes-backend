import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
import { uploadSingle, processUpload } from '../middlewares/upload';

const router = Router();
const controller = new ServiceController();

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', uploadSingle('image'), processUpload, controller.create);
router.put('/:id', uploadSingle('image'), processUpload, controller.update);
router.delete('/:id', controller.delete);
router.post('/:id/duplicate', controller.duplicate);

export default router;
