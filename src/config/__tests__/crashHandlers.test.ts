import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.mock('../logger', () => ({
  __esModule: true,
  default: { fatal: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

import logger from '../logger';
import * as Sentry from '@sentry/node';
import { registerGlobalCrashHandlers } from '../crashHandlers';

// Achado (Fase 3): não havia handlers globais para uncaughtException/unhandledRejection —
// um erro não tratado em qualquer lugar do app derrubava o processo sem log estruturado e
// sem chegar ao Sentry. Os handlers são exercitados aqui diretamente (capturando a função
// passada para process.on) para não arriscar derrubar o próprio processo do Jest.
describe('registerGlobalCrashHandlers - handlers globais de crash', () => {
  let handlers: Record<string, (...args: any[]) => void>;
  let exitSpy: ReturnType<typeof jest.spyOn>;
  let onSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = {};
    onSpy = jest.spyOn(process, 'on').mockImplementation(((event: string, handler: any) => {
      handlers[event] = handler;
      return process;
    }) as any);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    registerGlobalCrashHandlers();
  });

  afterEach(() => {
    onSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('registra handlers para uncaughtException e unhandledRejection', () => {
    expect(typeof handlers['uncaughtException']).toBe('function');
    expect(typeof handlers['unhandledRejection']).toBe('function');
  });

  it('uncaughtException: loga em fatal, reporta ao Sentry e encerra o processo com código 1', () => {
    const err = new Error('falha inesperada');
    handlers['uncaughtException'](err);

    expect(logger.fatal).toHaveBeenCalledWith(expect.objectContaining({ err }), expect.any(String));
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('unhandledRejection: loga, reporta ao Sentry e encerra o processo, mesmo com uma rejeição que não é Error', () => {
    handlers['unhandledRejection']('motivo em string, não um Error');

    expect(logger.fatal).toHaveBeenCalled();
    const reportedError = (Sentry.captureException as jest.Mock).mock.calls[0][0];
    expect(reportedError).toBeInstanceOf(Error);
    expect(reportedError.message).toContain('motivo em string');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
