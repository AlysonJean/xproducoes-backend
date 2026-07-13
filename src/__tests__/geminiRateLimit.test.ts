import { describe, expect, it, jest, beforeAll } from '@jest/globals';

// Achado (auditoria): GET /gemini/suggest-theme dispara uma chamada real a uma API paga
// de IA (Gemini/Hugging Face) a cada request. O rate limit dedicado (3/min) antes vivia
// num Map em memória própria do controller que nunca expirava chaves antigas — vazamento
// lento de memória num processo Node de longa duração. Este teste prova que a mesma regra
// (3/min, mesma mensagem) continua valendo agora usando express-rate-limit
// (aiSuggestionRateLimit em rateLimitMiddleware.ts), que expira entradas automaticamente.
jest.mock('../services/geminiService', () => ({
  GeminiService: jest.fn().mockImplementation(() => ({
    suggestEventTheme: jest.fn().mockResolvedValue('Sugestão de teste'),
  })),
}));

import request from 'supertest';

let app: typeof import('../app').default;

beforeAll(async () => {
  ({ default: app } = await import('../app'));
});

describe('GET /api/v1/gemini/suggest-theme - rate limit dedicado', () => {
  it('permite 3 requisições por minuto e bloqueia a 4ª com 429', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/api/v1/gemini/suggest-theme');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, suggestion: 'Sugestão de teste' });
    }

    const blocked = await request(app).get('/api/v1/gemini/suggest-theme');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      message: 'Muitas solicitações de IA. Tente novamente em 1 minuto.',
    });
  });
});
