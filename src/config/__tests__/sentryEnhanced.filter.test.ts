import { describe, expect, it } from '@jest/globals';
import type * as Sentry from '@sentry/node';
import { shouldSendSentryEvent } from '../sentryEnhanced';

function makeEvent(overrides: Partial<Sentry.ErrorEvent> = {}): Sentry.ErrorEvent {
  return { message: 'evento de teste', ...overrides } as Sentry.ErrorEvent;
}

// Achado (Fase 3): o beforeSend do Sentry descartava TODO erro com "ECONNREFUSED" na
// mensagem — inclusive uma queda real do banco/Redis — e amostrava aleatoriamente apenas
// 30% dos erros de banco de dados, escondendo justamente os sinais mais críticos durante
// um incidente real.
describe('shouldSendSentryEvent - filtro do Sentry não deve mais silenciar erros críticos', () => {
  it('NÃO descarta mais um erro de ECONNREFUSED (ex.: banco/Redis fora do ar)', () => {
    const event = makeEvent();
    const hint = { originalException: new Error('connect ECONNREFUSED 127.0.0.1:5432') };

    expect(shouldSendSentryEvent(event, hint)).toBe(event);
  });

  it('NÃO amostra/descarta erros de banco de dados aleatoriamente', () => {
    const event = makeEvent({ contexts: { database: { duration: 1500 } } } as any);
    const hint = { originalException: new Error('Query timeout') };

    // Roda várias vezes: antes da correção, ~70% das chamadas retornariam null (Math.random).
    for (let i = 0; i < 50; i++) {
      expect(shouldSendSentryEvent(event, hint)).toBe(event);
    }
  });

  it('ainda descarta ruído de baixo valor (ENOENT)', () => {
    const event = makeEvent();
    const hint = { originalException: new Error('ENOENT: no such file or directory') };

    expect(shouldSendSentryEvent(event, hint)).toBeNull();
  });

  it('ainda descarta ruído de baixo valor (mensagem contendo 404)', () => {
    const event = makeEvent();
    const hint = { originalException: new Error('Resource 404 not found') };

    expect(shouldSendSentryEvent(event, hint)).toBeNull();
  });

  it('deixa passar um erro de aplicação comum, sem relação com os filtros', () => {
    const event = makeEvent();
    const hint = { originalException: new Error('Falha ao processar pagamento') };

    expect(shouldSendSentryEvent(event, hint)).toBe(event);
  });
});
