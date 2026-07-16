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
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
jest.mock('../../services/cacheService', () => ({
  cacheService: {
    acquireLock: mockAcquireLock,
    releaseLock: mockReleaseLock,
    get: mockCacheGet,
    set: mockCacheSet,
  },
}));

const mockFindMany = jest.fn();
jest.mock('../../config/prisma', () => ({
  prisma: {
    booking: { findMany: mockFindMany },
  },
}));

const mockQueueEmail = jest.fn();
jest.mock('../../config/jobQueue', () => ({
  queueEmail: mockQueueEmail,
}));

import { startAbandonedCartReminderScheduler } from '../abandonedCartReminder';

// Achado (auditoria de produto): não existia nenhuma recuperação de orçamento
// abandonado — "carrinho" é um Booking com status DRAFT que fica parado indefinidamente
// se o cliente autenticado nunca finalizar o envio.
describe('abandonedCartReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cronCallback = undefined;
    process.env.ENABLE_CRON_JOBS = 'true';
    process.env.FRONTEND_URL = 'https://xproducoeseeventos.com.br';
    startAbandonedCartReminderScheduler();
  });

  it('pula o ciclo quando o lock já está em uso por outra instância', async () => {
    mockAcquireLock.mockResolvedValue(false);

    await cronCallback!();

    expect(mockAcquireLock).toHaveBeenCalledWith('abandoned-cart-reminder', expect.any(Number));
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockReleaseLock).not.toHaveBeenCalled();
  });

  it('busca só DRAFT com itens reais, mais antigo que o corte, e libera o lock ao final', async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockFindMany.mockResolvedValue([]);

    await cronCallback!();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'DRAFT',
          updatedAt: { lte: expect.any(Date) },
        }),
      })
    );
    expect(mockReleaseLock).toHaveBeenCalledWith('abandoned-cart-reminder');
  });

  it('envia lembrete para carrinho abandonado com e-mail, e marca como enviado', async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockCacheGet.mockResolvedValue(null); // ainda não enviado
    mockFindMany.mockResolvedValue([
      {
        id: 'cart1',
        creator: { id: 'u1', name: 'Cliente Teste', email: 'cliente@teste.com' },
        equipments: [{ name: 'Caixa JBL' }],
        kit: null,
      },
    ]);

    await cronCallback!();

    expect(mockQueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'notification',
        to: 'cliente@teste.com',
        templateData: expect.objectContaining({
          message: expect.stringContaining('Caixa JBL'),
        }),
      })
    );
    expect(mockCacheSet).toHaveBeenCalledWith('abandoned-cart-sent:cart1', true, expect.any(Number));
  });

  it('não envia de novo se já foi enviado recentemente (flag no cache)', async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockCacheGet.mockResolvedValue(true); // já enviado
    mockFindMany.mockResolvedValue([
      { id: 'cart1', creator: { id: 'u1', name: 'Cliente', email: 'x@teste.com' }, equipments: [], kit: null },
    ]);

    await cronCallback!();

    expect(mockQueueEmail).not.toHaveBeenCalled();
  });

  it('pula carrinhos sem e-mail do criador, sem lançar erro', async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockFindMany.mockResolvedValue([
      { id: 'cart1', creator: { id: 'u1', name: 'Sem Email', email: null }, equipments: [], kit: null },
    ]);

    await expect(cronCallback!()).resolves.toBeUndefined();
    expect(mockQueueEmail).not.toHaveBeenCalled();
  });

  it('libera o lock mesmo se o job falhar no meio (finally)', async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockFindMany.mockRejectedValue(new Error('falha de banco'));

    await cronCallback!();

    expect(mockReleaseLock).toHaveBeenCalledWith('abandoned-cart-reminder');
  });
});
