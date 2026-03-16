import pino from "pino";
import { getRequestId } from "./asyncContext";

const isDevelopment = process.env.NODE_ENV !== "production";

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  mixin: () => {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
});

type LogMethod = (messageOrObj: unknown, dataOrMessage?: unknown) => void;

type BoundLogMethod = (obj?: unknown, msg?: string, ...args: unknown[]) => void;

type AppLogger = {
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  debug: LogMethod;
  fatal: typeof pinoLogger.fatal;
  trace: typeof pinoLogger.trace;
  child: typeof pinoLogger.child;
  level: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizePayload = (value: unknown): Record<string, unknown> => {
  if (isRecord(value)) {
    return value;
  }

  if (value instanceof Error) {
    return {
      err: value,
      message: value.message,
      name: value.name,
    };
  }

  if (value === undefined) {
    return {};
  }

  return { value };
};

const emitLog = (
  method: typeof pinoLogger.info,
  messageOrObj: unknown,
  dataOrMessage?: unknown,
) => {
  if (typeof messageOrObj === 'string') {
    method(normalizePayload(dataOrMessage), messageOrObj);
    return;
  }

  if (typeof dataOrMessage === 'string') {
    method(normalizePayload(messageOrObj), dataOrMessage);
    return;
  }

  method(normalizePayload(messageOrObj));
};

const fallbackLogMethod = (consoleMethod: (...args: unknown[]) => void): BoundLogMethod => {
  return (obj?: unknown, msg?: string, ...args: unknown[]) => {
    if (typeof msg === "string") {
      consoleMethod(msg, obj, ...args);
      return;
    }

    consoleMethod(obj, ...args);
  };
};

const bindMethod = (
  method: typeof pinoLogger.info | undefined,
  fallback: BoundLogMethod,
): BoundLogMethod => {
  if (typeof method === "function") {
    return method.bind(pinoLogger);
  }

  return fallback;
};

// Wrapper para aceitar sintaxe flexível: logger.method(message, data) OU logger.method(data, message)
const logger: AppLogger = {
  info: (messageOrObj, dataOrMessage) => {
    emitLog(bindMethod(pinoLogger.info, fallbackLogMethod(console.info)), messageOrObj, dataOrMessage);
  },
  
  warn: (messageOrObj, dataOrMessage) => {
    emitLog(bindMethod(pinoLogger.warn, bindMethod(pinoLogger.info, fallbackLogMethod(console.warn))), messageOrObj, dataOrMessage);
  },
  
  error: (messageOrObj, dataOrMessage) => {
    emitLog(bindMethod(pinoLogger.error, bindMethod(pinoLogger.info, fallbackLogMethod(console.error))), messageOrObj, dataOrMessage);
  },
  
  debug: (messageOrObj, dataOrMessage) => {
    emitLog(bindMethod(pinoLogger.debug, bindMethod(pinoLogger.info, fallbackLogMethod(console.debug))), messageOrObj, dataOrMessage);
  },
  
  // Métodos adicionais do Pino
  fatal: bindMethod(pinoLogger.fatal, bindMethod(pinoLogger.error, fallbackLogMethod(console.error))),
  trace: bindMethod(pinoLogger.trace, bindMethod(pinoLogger.debug, bindMethod(pinoLogger.info, fallbackLogMethod(console.debug)))),
  child: pinoLogger.child ? pinoLogger.child.bind(pinoLogger) : (() => logger as any),
  level: pinoLogger.level,
};

export default logger;
