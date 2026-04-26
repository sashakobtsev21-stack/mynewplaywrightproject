import pino, { type Logger } from 'pino';
import { env, isCi } from '../config/env';

// Pretty-print locally, plain JSON in CI so artefacts stay machine-readable.
const transport = isCi
  ? undefined
  : {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
    };

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  transport,
});

export const childLogger = (scope: string): Logger => logger.child({ scope });
