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

// Nomes de campo (case-insensitive) que nunca devem sair em texto puro nos
// logs — comparados diretamente (senha, tokens, chave interna) ou parcialmente
// mascarados quando ajudam a correlacionar sem expor o dado inteiro (email,
// telefone). "body"/"payload" são tratados à parte: mantém as chaves (útil
// para depuração), mas nunca os valores, já que podem carregar nome,
// endereço etc. que não estão cobertos pela lista de campos sensíveis.
const FULLY_REDACTED_KEYS = new Set([
  "password", "senha", "passwordhash", "currentpassword", "newpassword",
  "token", "accesstoken", "refreshtoken", "authorization", "cookie",
  "secret", "apikey", "x-internal-key", "cpf", "cnpj", "creditcard", "cvv",
]);
const MASKED_KEYS = new Set(["email", "phone", "telefone", "celular"]);
const BODY_LIKE_KEYS = new Set(["body", "payload", "reqbody"]);

function maskValue(value: unknown): string {
  const str = String(value);
  if (str.length <= 4) return "[REDACTED]";
  return `${str.slice(0, 2)}***${str.slice(-2)}`;
}

// Exportado só para teste unitário direto da lógica de redação.
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value;
  if (value instanceof Error) return value; // preserva serialização nativa do pino
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, depth + 1));
  if (!isRecord(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();
    if (FULLY_REDACTED_KEYS.has(lowerKey)) {
      out[key] = "[REDACTED]";
    } else if (MASKED_KEYS.has(lowerKey) && (typeof val === "string" || typeof val === "number")) {
      out[key] = maskValue(val);
    } else if (BODY_LIKE_KEYS.has(lowerKey) && isRecord(val)) {
      out[key] = Object.keys(val).reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = "[REDACTED]";
        return acc;
      }, {});
    } else {
      out[key] = redactSensitive(val, depth + 1);
    }
  }
  return out;
}

const normalizePayload = (value: unknown): Record<string, unknown> => {
  if (isRecord(value)) {
    return redactSensitive(value) as Record<string, unknown>;
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
