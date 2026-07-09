import * as Sentry from '@sentry/node';
import logger from './logger.js';

/**
 * Handlers globais de crash (Fase 3). Antes desta correção, uma exceção não tratada ou uma
 * Promise rejeitada sem .catch em qualquer lugar do app derrubava o processo silenciosamente
 * — sem log estruturado, sem chegar ao Sentry, e sem nenhum sinal para o operador além do
 * processo simplesmente parar (e o Render reiniciá-lo, se configurado).
 *
 * Por design do Node, o processo está em estado indefinido após um uncaughtException — a
 * ação correta é logar, reportar e encerrar rápido (deixando a plataforma reiniciar), não
 * tentar continuar rodando nem fazer um shutdown gracioso completo (que pode travar num
 * processo já corrompido). unhandledRejection recebe o mesmo tratamento: ignorá-la
 * silenciosamente só esconde bugs reais.
 */
export function registerGlobalCrashHandlers(): void {
  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'uncaughtException não tratada — encerrando processo');
    Sentry.captureException(err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.fatal({ err: error }, 'unhandledRejection não tratada — encerrando processo');
    Sentry.captureException(error);
    process.exit(1);
  });
}
