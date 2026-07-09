
import type { Request, Response } from 'express';
import { createSafeRouter } from '../middlewares/safeRouter';
import { authenticateWithDB, requireAdmin } from '../middlewares/unifiedAuth';
import { whatsappController } from '../controllers/whatsappController';

const whatsappRoutes = createSafeRouter();

// authenticateWithDB revalida isActive/role no banco a cada requisição.
whatsappRoutes.get('/status', authenticateWithDB, requireAdmin, (req: Request, res: Response) => whatsappController.getStatus(req, res));
whatsappRoutes.post('/logout', authenticateWithDB, requireAdmin, (req: Request, res: Response) => whatsappController.logout(req, res));
whatsappRoutes.post('/restart', authenticateWithDB, requireAdmin, (req: Request, res: Response) => whatsappController.restart(req, res));

export default whatsappRoutes;
