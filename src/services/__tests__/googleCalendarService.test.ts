import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock do googleapis: generateAuthUrl é local (sem rede), getToken/userinfo são
// mockados para simular uma troca de código válida sem chamar o Google de verdade.
const mockGetToken = jest.fn();
const mockUserinfoGet = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: (opts: any) => `https://accounts.google.com/o/oauth2/v2/auth?state=${encodeURIComponent(opts.state)}`,
        getToken: mockGetToken,
        setCredentials: jest.fn(),
      })),
    },
    oauth2: jest.fn().mockImplementation(() => ({
      userinfo: { get: mockUserinfoGet },
    })),
  },
}));

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: { update: jest.fn() },
  },
}));

import jwt from 'jsonwebtoken';
import { googleCalendarService } from '../googleCalendarService';
import { prisma } from '../../config/prisma';
import { config } from '../../config/environment';

describe('googleCalendarService - proteção contra CSRF no state do OAuth', () => {
  beforeEach(() => {
    mockGetToken.mockReset();
    mockUserinfoGet.mockReset();
    (prisma.user.update as jest.Mock<any>).mockReset();
  });

  it('generateAuthUrl produz um state assinado (não mais o userId em texto puro)', () => {
    const url = googleCalendarService.generateAuthUrl('victim-user-id');
    const state = new URL(url).searchParams.get('state')!;

    // Não é mais literalmente o userId
    expect(state).not.toBe('victim-user-id');

    // É um JWT válido, assinado pelo próprio segredo do servidor, contendo o userId
    const decoded = jwt.verify(state, config.jwtSecret) as { userId: string; purpose: string };
    expect(decoded.userId).toBe('victim-user-id');
    expect(decoded.purpose).toBe('google-calendar-oauth-state');
  });

  it('handleCallback rejeita um state forjado (o ataque que funcionava antes: state = userId de outra pessoa em texto puro)', async () => {
    mockGetToken.mockResolvedValue({ tokens: { refresh_token: 'attacker-refresh-token' } });
    mockUserinfoGet.mockResolvedValue({ data: { email: 'attacker@example.com' } });

    await expect(
      googleCalendarService.handleCallback('valid-code', 'victim-user-id')
    ).rejects.toThrow();

    // Nunca deve ter tentado gravar o token do atacante na conta da vítima
    expect(prisma.user.update).not.toHaveBeenCalled();
    // Nem deveria ter chegado a trocar o code com o Google
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('handleCallback rejeita um state assinado com segredo errado (tentativa de forjar o token)', async () => {
    const forged = jwt.sign({ userId: 'victim-user-id', purpose: 'google-calendar-oauth-state' }, 'segredo-errado', { expiresIn: '10m' });

    await expect(
      googleCalendarService.handleCallback('valid-code', forged)
    ).rejects.toThrow();

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('handleCallback aceita o state real gerado por generateAuthUrl e grava no usuário correto', async () => {
    mockGetToken.mockResolvedValue({ tokens: { refresh_token: 'real-refresh-token' } });
    mockUserinfoGet.mockResolvedValue({ data: { email: 'user@example.com' } });
    (prisma.user.update as jest.Mock<any>).mockResolvedValue({});

    const url = googleCalendarService.generateAuthUrl('real-user-id');
    const state = new URL(url).searchParams.get('state')!;

    const result = await googleCalendarService.handleCallback('valid-code', state);

    expect(result).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'real-user-id' } })
    );
  });
});
