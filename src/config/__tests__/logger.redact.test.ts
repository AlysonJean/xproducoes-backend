import { describe, expect, it } from '@jest/globals';
import { redactSensitive } from '../logger';

describe('redactSensitive - PII e segredos nunca devem sair em texto puro nos logs', () => {
  it('redige completamente campos de senha e token, em qualquer profundidade', () => {
    const input = {
      password: 'minhaSenha123',
      user: { token: 'jwt-abc', nested: { refreshToken: 'refresh-xyz' } },
    };
    const out = redactSensitive(input) as any;

    expect(out.password).toBe('[REDACTED]');
    expect(out.user.token).toBe('[REDACTED]');
    expect(out.user.nested.refreshToken).toBe('[REDACTED]');
  });

  it('mascara email e telefone (mantém parte para correlação, mas não o valor completo)', () => {
    const out = redactSensitive({ email: 'alyson@example.com', phone: '31988887777' }) as any;

    expect(out.email).not.toBe('alyson@example.com');
    expect(out.email).not.toContain('@example.com');
    expect(out.phone).not.toBe('31988887777');
  });

  it('em req.body / payload, mantém as chaves mas redige todos os valores (o achado original: log de req.body inteiro na atualização de reserva)', () => {
    const out = redactSensitive({
      payload: { name: 'Fulano de Tal', address: 'Rua X, 123', notes: 'ligar antes' },
    }) as any;

    expect(Object.keys(out.payload)).toEqual(['name', 'address', 'notes']);
    expect(out.payload.name).toBe('[REDACTED]');
    expect(out.payload.address).toBe('[REDACTED]');
  });

  it('não altera Error nem campos não sensíveis', () => {
    const err = new Error('algo falhou');
    const out = redactSensitive({ err, requestId: 'req-1', status: 500 }) as any;

    expect(out.err).toBe(err);
    expect(out.requestId).toBe('req-1');
    expect(out.status).toBe(500);
  });
});
