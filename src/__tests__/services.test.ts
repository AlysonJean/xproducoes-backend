import { describe, it, expect, jest } from '@jest/globals';

// 1. MOCK TOTAL das libs pesadas (Evita abrir Chrome/Puppeteer)
jest.mock('whatsapp-web.js', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockImplementation(() => Promise.resolve()),
      on: jest.fn(),
      sendMessage: jest.fn().mockImplementation(() => Promise.resolve(true)),
      destroy: jest.fn().mockImplementation(() => Promise.resolve()),
      logout: jest.fn().mockImplementation(() => Promise.resolve()),
      getState: jest.fn().mockReturnValue('CONNECTED'),
    })),
    LocalAuth: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock('qrcode-terminal', () => ({
  generate: jest.fn(),
}));

jest.mock('googleapis', () => ({
  google: {
    auth: { OAuth2: jest.fn() },
    calendar: jest.fn()
  }
}));

// Mock do logger para limpar o output
jest.mock('pino', () => () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  child: jest.fn().mockReturnThis()
}));

// Importar o serviço APÓS os mocks
import { whatsappService } from '../services/whatsappService';

describe('Smoke Tests (Leves)', () => {
  it('WhatsappService deve carregar sem travar o PC', async () => {
    expect(whatsappService).toBeDefined();
    // Verifica apenas se o método existe, sem executar lógica pesada
    expect(typeof whatsappService.initialize).toBe('function');
  });

  it('WhatsappService deve ter status inicial correto', () => {
    const status = whatsappService.getStatus();
    expect(status).toHaveProperty('isReady');
  });
});
