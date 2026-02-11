import { createSafeRouter } from '../middlewares/safeRouter';
import { googleCalendarService } from '../services/googleCalendarService';
import { AuthenticatedRequest, authenticate } from '../middlewares/unifiedAuth';
import logger from '../config/logger';

const router = createSafeRouter();

// Rota para iniciar a conexão com o Google (retorna a URL de auth)
router.get('/auth', authenticate, (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const url = googleCalendarService.generateAuthUrl(userId);
    return res.json({ url });
  } catch (error) {
    logger.error('Erro ao gerar URL de auth do Google', error);
    return res.status(500).json({ error: 'Falha ao iniciar integração' });
  }
});

// Callback que o Google chama após o login
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query; // 'state' é o userId que passamos antes
    
    if (!code || !state) {
      return res.status(400).send('Parâmetros inválidos');
    }

    await googleCalendarService.handleCallback(code as string, state as string);
    
    // Redireciona para o frontend com sucesso
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/admin/profile?google_connected=success`);
  } catch (error) {
    logger.error('Erro no callback do Google', error);
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/admin/profile?google_connected=error`);
  }
});

export default router;
