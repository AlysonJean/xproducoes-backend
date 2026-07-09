import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { config } from '../environment';

const mockIsTokenBlacklisted = jest.fn();
jest.mock('../../services/jwtBlacklistService', () => ({
  isTokenBlacklisted: mockIsTokenBlacklisted,
}));

import { parseCookieHeader, resolveSocketTokenPayload } from '../socket';

function signToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '15m' });
}

// Achado (Fase 4): o handshake do Socket.IO só era autenticado via `auth.token`/
// `query.token` — mas o frontend nunca teve um JWT legível por JS para colocar ali (a
// arquitetura usa cookies httpOnly desde a migração de segurança). Na prática, TODA
// conexão de um usuário logado caía como "público", e recursos como notificação de chat
// em tempo real nunca funcionavam para ninguém. Também não havia checagem de `type`
// (aceitava um refresh token) nem de blacklist (aceitava um token já revogado).
describe('parseCookieHeader', () => {
  it('parseia múltiplos cookies do cabeçalho cru', () => {
    expect(parseCookieHeader('x_access_token=abc123; other=xyz')).toEqual({
      x_access_token: 'abc123',
      other: 'xyz',
    });
  });

  it('retorna objeto vazio para cabeçalho ausente ou vazio', () => {
    expect(parseCookieHeader(undefined)).toEqual({});
    expect(parseCookieHeader('')).toEqual({});
  });
});

describe('resolveSocketTokenPayload - autenticação do handshake do Socket.IO via cookie httpOnly', () => {
  beforeEach(() => {
    mockIsTokenBlacklisted.mockReset();
    mockIsTokenBlacklisted.mockResolvedValue(false);
  });

  it('autentica via cookie httpOnly (x_access_token) — o caminho real usado pelo frontend', async () => {
    const token = signToken({ userId: 'user-1', role: 'CLIENT', type: 'access' });

    const result = await resolveSocketTokenPayload({
      headers: { cookie: `x_access_token=${token}; other=1` },
    });

    expect(result).toEqual({ userId: 'user-1', role: 'CLIENT' });
  });

  it('aceita auth.token como fallback explícito quando não há cookie', async () => {
    const token = signToken({ userId: 'user-2', role: 'ADMIN', type: 'access' });

    const result = await resolveSocketTokenPayload({
      auth: { token },
      headers: {},
    });

    expect(result).toEqual({ userId: 'user-2', role: 'ADMIN' });
  });

  it('retorna null quando não há token em lugar nenhum (conecta como público)', async () => {
    const result = await resolveSocketTokenPayload({ headers: {} });
    expect(result).toBeNull();
  });

  it('rejeita um refresh token usado no handshake (type incorreto)', async () => {
    const token = signToken({ userId: 'user-3', role: 'CLIENT', type: 'refresh' });

    const result = await resolveSocketTokenPayload({
      headers: { cookie: `x_access_token=${token}` },
    });

    expect(result).toBeNull();
  });

  it('rejeita um token já revogado (blacklist)', async () => {
    mockIsTokenBlacklisted.mockResolvedValue(true);
    const token = signToken({ userId: 'user-4', role: 'CLIENT', type: 'access' });

    const result = await resolveSocketTokenPayload({
      headers: { cookie: `x_access_token=${token}` },
    });

    expect(result).toBeNull();
  });

  it('retorna null para um token malformado, sem lançar exceção', async () => {
    const result = await resolveSocketTokenPayload({
      headers: { cookie: 'x_access_token=isto-nao-e-um-jwt-valido' },
    });

    expect(result).toBeNull();
  });
});
