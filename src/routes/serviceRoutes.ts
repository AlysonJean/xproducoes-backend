import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
import { uploadSingle } from '../middlewares/upload';

const router = Router();
const controller = new ServiceController();

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', uploadSingle('image'), controller.create);
router.put('/:id', uploadSingle('image'), controller.update);
router.delete('/:id', controller.delete);

export default router;
