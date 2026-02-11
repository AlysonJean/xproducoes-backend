import { createSafeRouter } from '../middlewares/safeRouter';
import { safeFetch } from '../utils/safeFetch';
import { apiRateLimit } from '../middlewares/rateLimitMiddleware';

const router = createSafeRouter();

// Proxy para ViaCEP
router.get('/:cep', apiRateLimit, async (req, res) => {
  const { cep } = req.params;
  if (!cep || cep.length !== 8) {
    return res.status(400).json({ erro: true, message: 'CEP inválido' });
  }
  try {
    const viaCepUrl = `https://viacep.com.br/ws/${cep}/json/`;
  const response = await safeFetch(viaCepUrl, { allowedHosts: new Set(['viacep.com.br']) });
  const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: true, message: 'Erro ao buscar CEP' });
  }
});

export default router;
