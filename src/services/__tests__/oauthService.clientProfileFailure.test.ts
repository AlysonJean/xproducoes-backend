import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { config } from '../../config/environment';

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    client: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../utils/safeFetch', () => ({
  safeFetch: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(async () => 'hashed'),
}));

import { prisma } from '../../config/prisma';
import logger from '../../config/logger';
import { safeFetch } from '../../utils/safeFetch';
import { handleFacebookCallback } from '../oauthService';

const mockedPrisma: any = prisma as any;
const mockedSafeFetch = safeFetch as jest.Mock<any>;

function fakeJsonResponse(body: unknown, ok = true) {
  return { ok, statusText: 'OK', json: async () => body } as any;
}

// Achado (Fase 4): ao criar um usuário novo via login social, a criação do perfil de
// Client associado (necessário para reservas/orçamentos) era envolvida num try/catch
// totalmente vazio — se prisma.client.create falhasse, o erro desaparecia sem nenhum
// rastro, e o próximo sintoma seria algum bug obscuro bem mais tarde (ex.: "perfil de
// cliente não encontrado" ao tentar reservar).
describe('handleFacebookCallback - falha ao criar o perfil de Client não deve ser silenciosa', () => {
  const redirectUri = 'https://app.example.com/auth/facebook/callback';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FACEBOOK_CLIENT_ID = 'fb-client-id';
    process.env.FACEBOOK_CLIENT_SECRET = 'fb-client-secret';

    mockedSafeFetch.mockImplementation(async (url: string) => {
      if (url.includes('/oauth/access_token')) {
        return fakeJsonResponse({ access_token: 'fake-access-token' });
      }
      if (url.includes('/me?')) {
        return fakeJsonResponse({ id: 'fb-123', name: 'Fulano', email: 'fulano@example.com' });
      }
      throw new Error(`unexpected safeFetch url: ${url}`);
    });
  });

  function signValidState() {
    return jwt.sign({ v: 'code-verifier-value', n: 'nonce-value' }, config.jwtSecret, { expiresIn: '10m' });
  }

  it('loga o erro (não silencia) quando prisma.client.create falha, mas ainda assim completa o login com sucesso', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue({
      id: 'new-user-id',
      name: 'Fulano',
      email: 'fulano@example.com',
      role: 'CLIENT',
      avatarUrl: null,
      socialProvider: 'facebook',
    });
    mockedPrisma.client.create.mockRejectedValue(new Error('constraint violation'));
    mockedPrisma.client.findUnique.mockResolvedValue(null);

    const result = await handleFacebookCallback({
      code: 'auth-code',
      state: signValidState(),
      redirectUri,
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'new-user-id', socialProvider: 'facebook' }),
      expect.stringContaining('Falha ao criar perfil de Client'),
    );
    expect(result.user.id).toBe('new-user-id');
    expect(result.token).toBeTruthy();
  });

  it('quando prisma.client.create funciona normalmente, nenhum erro é logado', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue({
      id: 'new-user-id-2',
      name: 'Fulano',
      email: 'fulano@example.com',
      role: 'CLIENT',
      avatarUrl: null,
      socialProvider: 'facebook',
    });
    mockedPrisma.client.create.mockResolvedValue({ id: 'client-1', userId: 'new-user-id-2' });
    mockedPrisma.client.findUnique.mockResolvedValue({ id: 'client-1', userId: 'new-user-id-2', phone: null });

    const result = await handleFacebookCallback({
      code: 'auth-code',
      state: signValidState(),
      redirectUri,
    });

    expect(logger.error).not.toHaveBeenCalled();
    expect(result.user.id).toBe('new-user-id-2');
  });
});
