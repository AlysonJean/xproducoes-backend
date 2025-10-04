import { Router } from 'express';
import { getAppSettings, updateAppSettings } from '../controllers/settingsController';

const router = Router();

// Rotas para configurações da aplicação
router.get('/', getAppSettings);
router.put('/', updateAppSettings);

export default router;