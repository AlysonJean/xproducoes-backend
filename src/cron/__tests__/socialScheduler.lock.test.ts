import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let cronCallback: (() => Promise<void>) | undefined;
jest.mock('node-cron', () => ({
  __esModule: true,
  default: {
    schedule: jest.fn((_expr: string, cb: () => Promise<void>) => {
      cronCallback = cb;
    }),
  },
}));

const mockAcquireLock = jest.fn();
const mockReleaseLock = jest.fn();
jest.mock('../../services/cacheService', () => ({
  cacheService: {
    acquireLock: mockAcquireLock,
    releaseLock: mockReleaseLock,
  },
}));

const mockFindMany = jest.fn();
jest.mock('../../config/prisma', () => ({
  prisma: {
    eventSocialSetting: {
      findMany: mockFindMany,
    },
  },
}));

jest.mock('../../services/social/InstagramService', () => ({
  __esModule: true,
  default: { fetchRecentMedia: jest.fn() },
}));

import { startSocialScheduler } from '../socialScheduler';

// Achado (Fase 3): o guard anterior (`isRunning`) era uma variável local ao processo —
// não protege contra duas instâncias diferentes rodando o mesmo ciclo ao mesmo tempo.
describe('socialScheduler - lock distribuído impede execução concorrente entre instâncias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cronCallback = undefined;
    process.env.ENABLE_CRON_JOBS = 'true';
    startSocialScheduler();
  });

  it('pula o ciclo (não consulta settings) quando o lock já está em uso por outra instância', async () => {
    mockAcquireLock.mockResolvedValue(false);

    await cronCallback!();

    expect(mockAcquireLock).toHaveBeenCalledWith('social-scheduler', expect.any(Number));
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockReleaseLock).not.toHaveBeenCalled();
  });

  it('processa o ciclo normalmente quando o lock é adquirido, e libera o lock ao final', async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockFindMany.mockResolvedValue([]);

    await cronCallback!();

    expect(mockFindMany).toHaveBeenCalled();
    expect(mockReleaseLock).toHaveBeenCalledWith('social-scheduler');
  });

  it('libera o lock mesmo se o job falhar no meio (finally)', async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockFindMany.mockRejectedValue(new Error('falha de banco'));

    await cronCallback!();

    expect(mockReleaseLock).toHaveBeenCalledWith('social-scheduler');
  });
});
