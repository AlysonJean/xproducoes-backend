import { describe, expect, it } from '@jest/globals';
import { isRedisRequiredButMissing } from '../environment';

describe('isRedisRequiredButMissing - Redis obrigatório em produção (lockout de login e blacklist de JWT)', () => {
  it('sinaliza como faltando quando NODE_ENV=production e nenhuma URL de Redis está definida', () => {
    expect(isRedisRequiredButMissing({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(true);
  });

  it('não sinaliza quando REDIS_URL está definido em produção', () => {
    expect(
      isRedisRequiredButMissing({ NODE_ENV: 'production', REDIS_URL: 'redis://:pass@host:6379' } as NodeJS.ProcessEnv),
    ).toBe(false);
  });

  it('não sinaliza quando apenas UPSTASH_REDIS_REST_URL está definido em produção', () => {
    expect(
      isRedisRequiredButMissing({ NODE_ENV: 'production', UPSTASH_REDIS_REST_URL: 'https://x.upstash.io' } as NodeJS.ProcessEnv),
    ).toBe(false);
  });

  it('não sinaliza fora de produção, mesmo sem nenhuma URL de Redis configurada', () => {
    expect(isRedisRequiredButMissing({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isRedisRequiredButMissing({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(false);
  });
});
