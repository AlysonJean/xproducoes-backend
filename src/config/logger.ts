import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || "info",
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

// Wrapper para aceitar sintaxe flexível: logger.method(message, data) OU logger.method(data, message)
const logger = {
  info: (messageOrObj: any, dataOrMessage?: any) => {
    if (typeof messageOrObj === 'string') {
      // Sintaxe: logger.info('message', data)
      pinoLogger.info(dataOrMessage || {}, messageOrObj);
    } else {
      // Sintaxe Pino nativa: logger.info(data, 'message')
      pinoLogger.info(messageOrObj, dataOrMessage);
    }
  },
  
  warn: (messageOrObj: any, dataOrMessage?: any) => {
    if (typeof messageOrObj === 'string') {
      pinoLogger.warn(dataOrMessage || {}, messageOrObj);
    } else {
      pinoLogger.warn(messageOrObj, dataOrMessage);
    }
  },
  
  error: (messageOrObj: any, dataOrMessage?: any) => {
    if (typeof messageOrObj === 'string') {
      pinoLogger.error(dataOrMessage || {}, messageOrObj);
    } else {
      pinoLogger.error(messageOrObj, dataOrMessage);
    }
  },
  
  debug: (messageOrObj: any, dataOrMessage?: any) => {
    if (typeof messageOrObj === 'string') {
      pinoLogger.debug(dataOrMessage || {}, messageOrObj);
    } else {
      pinoLogger.debug(messageOrObj, dataOrMessage);
    }
  },
  
  // Métodos adicionais do Pino
  fatal: pinoLogger.fatal.bind(pinoLogger),
  trace: pinoLogger.trace.bind(pinoLogger),
  child: pinoLogger.child.bind(pinoLogger),
  level: pinoLogger.level,
};

export default logger;
