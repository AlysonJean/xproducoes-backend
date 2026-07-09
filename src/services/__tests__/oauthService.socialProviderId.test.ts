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
import { safeFetch } from '../../utils/safeFetch';
import { handleFacebookCallback } from '../oauthService';

const mockedPrisma: any = prisma as any;
const mockedSafeFetch = safeFetch as jest.Mock<any>;

function fakeJsonResponse(body: unknown, ok = true) {
  return { ok, statusText: 'OK', json: async () => body } as any;
}

function signValidState() {
  return jwt.sign({ v: 'code-verifier-value', n: 'nonce-value' }, config.jwtSecret, { expiresIn: '10m' });
}

// Achado (Fase 4, LGPD): sem gravar o ID do usuário no provedor social (ex.: o `user_id`
// do Facebook), o callback de exclusão de dados da Meta nunca conseguia localizar a conta
// local correspondente — não havia como saber "esta conta local corresponde a este
// Facebook ID". Isso corrige o login social para sempre gravar esse vínculo.
describe('handleFacebookCallback - grava socialProviderId (necessário para o callback de exclusão de dados da Meta)', () => {
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
        return fakeJsonResponse({ id: 'fb-user-98765', name: 'Fulano', email: 'fulano@example.com' });
      }
      throw new Error(`unexpected safeFetch url: ${url}`);
    });
  });

  it('grava o ID do Facebook (me.id) em socialProviderId ao criar uma conta nova', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue({
      id: 'new-user-id', name: 'Fulano', email: 'fulano@example.com', role: 'CLIENT', avatarUrl: null,
    });
    mockedPrisma.client.create.mockResolvedValue({});
    mockedPrisma.client.findUnique.mockResolvedValue(null);

    await handleFacebookCallback({ code: 'auth-code', state: signValidState(), redirectUri });

    expect(mockedPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ socialProvider: 'facebook', socialProviderId: 'fb-user-98765' }),
      }),
    );
  });

  it('faz backfill de socialProviderId numa conta facebook já existente que ainda não tinha esse campo', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user-id', email: 'fulano@example.com', avatarUrl: 'x.png',
      socialProvider: 'facebook', socialProviderId: null,
    });
    mockedPrisma.client.findUnique.mockResolvedValue(null);

    await handleFacebookCallback({ code: 'auth-code', state: signValidState(), redirectUri });

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'existing-user-id' },
      data: { socialProviderId: 'fb-user-98765' },
    });
  });

  it('não sobrescreve socialProviderId se a conta já tiver um valor gravado', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user-id-2', email: 'fulano@example.com', avatarUrl: 'x.png',
      socialProvider: 'facebook', socialProviderId: 'fb-user-already-set',
    });
    mockedPrisma.client.findUnique.mockResolvedValue(null);

    await handleFacebookCallback({ code: 'auth-code', state: signValidState(), redirectUri });

    expect(mockedPrisma.user.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ socialProviderId: expect.anything() }) }),
    );
  });
});
