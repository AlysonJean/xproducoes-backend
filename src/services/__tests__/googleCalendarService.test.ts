import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock do googleapis: generateAuthUrl é local (sem rede), getToken/userinfo são
// mockados para simular uma troca de código válida sem chamar o Google de verdade.
const mockGetToken = jest.fn();
const mockUserinfoGet = jest.fn();
const mockSetCredentials = jest.fn();
const mockEventsInsert = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: (opts: any) => `https://accounts.google.com/o/oauth2/v2/auth?state=${encodeURIComponent(opts.state)}`,
        getToken: mockGetToken,
        setCredentials: mockSetCredentials,
      })),
    },
    oauth2: jest.fn().mockImplementation(() => ({
      userinfo: { get: mockUserinfoGet },
    })),
    calendar: jest.fn().mockImplementation(() => ({
      events: { insert: mockEventsInsert },
    })),
  },
}));

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: { update: jest.fn(), findUnique: jest.fn() },
  },
}));

import jwt from 'jsonwebtoken';
import { googleCalendarService } from '../googleCalendarService';
import { prisma } from '../../config/prisma';
import { config } from '../../config/environment';
import { decryptSecret, isEncryptedSecret } from '../../utils/tokenEncryption';

describe('googleCalendarService - proteção contra CSRF no state do OAuth', () => {
  beforeEach(() => {
    mockGetToken.mockReset();
    mockUserinfoGet.mockReset();
    mockSetCredentials.mockReset();
    mockEventsInsert.mockReset();
    (prisma.user.update as jest.Mock<any>).mockReset();
    (prisma.user.findUnique as jest.Mock<any>).mockReset();
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

describe('googleCalendarService - refresh token cifrado em repouso (Fase 2.4)', () => {
  beforeEach(() => {
    mockGetToken.mockReset();
    mockUserinfoGet.mockReset();
    mockSetCredentials.mockReset();
    mockEventsInsert.mockReset();
    (prisma.user.update as jest.Mock<any>).mockReset();
    (prisma.user.findUnique as jest.Mock<any>).mockReset();
  });

  it('handleCallback nunca grava o refresh token em texto puro no banco', async () => {
    mockGetToken.mockResolvedValue({ tokens: { refresh_token: 'plaintext-google-refresh-token' } });
    mockUserinfoGet.mockResolvedValue({ data: { email: 'user@example.com' } });
    (prisma.user.update as jest.Mock<any>).mockResolvedValue({});

    const url = googleCalendarService.generateAuthUrl('real-user-id');
    const state = new URL(url).searchParams.get('state')!;
    await googleCalendarService.handleCallback('valid-code', state);

    const call = (prisma.user.update as jest.Mock<any>).mock.calls[0][0];
    const storedValue = call.data.googleRefreshToken;

    expect(storedValue).not.toBe('plaintext-google-refresh-token');
    expect(storedValue).not.toContain('plaintext-google-refresh-token');
    expect(isEncryptedSecret(storedValue)).toBe(true);
    expect(decryptSecret(storedValue)).toBe('plaintext-google-refresh-token');
  });

  it('createEvent decifra o refresh token cifrado antes de usá-lo com a API do Google', async () => {
    const { encryptSecret } = require('../../utils/tokenEncryption');
    (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
      googleRefreshToken: encryptSecret('stored-plaintext-token'),
    });
    mockEventsInsert.mockResolvedValue({ data: { id: 'evt-1' } });

    await googleCalendarService.createEvent('real-user-id', {
      title: 'Evento teste',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: 'stored-plaintext-token' });
  });

  it('createEvent também funciona com um refresh token legado (texto puro, gravado antes desta mudança)', async () => {
    (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
      googleRefreshToken: 'legacy-plaintext-token',
    });
    mockEventsInsert.mockResolvedValue({ data: { id: 'evt-2' } });

    await googleCalendarService.createEvent('real-user-id', {
      title: 'Evento teste',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: 'legacy-plaintext-token' });
  });
});
