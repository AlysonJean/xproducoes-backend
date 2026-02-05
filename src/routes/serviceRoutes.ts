import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';

const router = Router();
const controller = new ServiceController();

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
