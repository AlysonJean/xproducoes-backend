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
    booking: {
      findMany: mockFindMany,
      update: jest.fn(),
    },
  },
}));

jest.mock('../../services/emailService', () => ({
  __esModule: true,
  default: { sendBookingReminder: jest.fn() },
}));

import { startReminderScheduler } from '../sendReminders';

// Achado (Fase 3): sendReminders.ts não tinha NENHUMA proteção contra execução
// concorrente (nem sequer o `isRunning` local que socialScheduler.ts tinha) — duas
// instâncias rodando ao mesmo tempo (ex.: durante um rolling deploy) podiam enviar o
// mesmo lembrete em duplicidade para o mesmo cliente.
describe('sendReminders - lock distribuído impede execução concorrente entre instâncias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cronCallback = undefined;
    process.env.ENABLE_CRON_JOBS = 'true';
    startReminderScheduler();
  });

  it('pula o ciclo (não consulta reservas) quando o lock já está em uso por outra instância', async () => {
    mockAcquireLock.mockResolvedValue(false);

    await cronCallback!();

    expect(mockAcquireLock).toHaveBeenCalledWith('send-reminders', expect.any(Number));
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockReleaseLock).not.toHaveBeenCalled();
  });

  it('processa o ciclo normalmente quando o lock é adquirido, e libera o lock ao final', async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockFindMany.mockResolvedValue([]);

    await cronCallback!();

    expect(mockFindMany).toHaveBeenCalled();
    expect(mockReleaseLock).toHaveBeenCalledWith('send-reminders');
  });

  it('libera o lock mesmo se o job falhar no meio (finally)', async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockFindMany.mockRejectedValue(new Error('falha de banco'));

    await cronCallback!();

    expect(mockReleaseLock).toHaveBeenCalledWith('send-reminders');
  });
});
