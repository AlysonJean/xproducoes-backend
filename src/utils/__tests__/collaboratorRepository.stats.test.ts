import { jest } from '@jest/globals';
import { CollaboratorRepository } from '../../repositories/collaboratorRepository';
import { prisma } from '../../config/prisma';

const collaboratorRepository = new CollaboratorRepository();

jest.mock('../../config/prisma', () => ({
  prisma: {
    eventCollaborator: { findMany: jest.fn() },
    collaborator: { update: jest.fn() },
  },
}));

const mockedPrisma: any = (prisma as any);

// Achado (auditoria de produto): CollaboratorReportsPage mostrava pontualidade fixa em 100%,
// avaliação mensal reaproveitando a média geral, e "N/A" para horário produtivo/duração média —
// tudo mockado no frontend com comentários admitindo que o backend não calculava isso. Estes
// campos agora são calculados a partir de dados reais já existentes (EventCollaborator.rating/
// startTime, Booking.eventDuration/eventDate) em vez de inventados no cliente.
describe('collaboratorRepository.getCollaboratorStats — novos campos de analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeEvent = (overrides: Record<string, unknown> = {}) => ({
    status: 'COMPLETED',
    rating: 5,
    totalPayment: 100,
    fixedRate: null,
    startTime: '14:00',
    createdAt: new Date('2027-03-15T00:00:00Z'),
    booking: { eventDuration: 4, eventDate: new Date('2027-03-15T00:00:00Z') },
    ...overrides,
  });

  it('calcula a duração média dos eventos a partir de Booking.eventDuration', async () => {
    mockedPrisma.eventCollaborator.findMany
      .mockResolvedValueOnce([makeEvent({ booking: { eventDuration: 4, eventDate: new Date() } }), makeEvent({ booking: { eventDuration: 6, eventDate: new Date() } })])
      .mockResolvedValueOnce([]) // getMonthlyEarnings
      .mockResolvedValueOnce([]); // getMonthlyRatings

    const stats = await collaboratorRepository.getCollaboratorStats('collab-1');
    expect(stats.averageEventDuration).toBe(5);
  });

  it('identifica o horário mais produtivo como a moda de startTime', async () => {
    mockedPrisma.eventCollaborator.findMany
      .mockResolvedValueOnce([
        makeEvent({ startTime: '14:00' }),
        makeEvent({ startTime: '14:30' }),
        makeEvent({ startTime: '09:00' }),
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const stats = await collaboratorRepository.getCollaboratorStats('collab-1');
    expect(stats.mostProductiveHour).toBe(14);
  });

  it('retorna mostProductiveHour null quando não há eventos', async () => {
    mockedPrisma.eventCollaborator.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const stats = await collaboratorRepository.getCollaboratorStats('collab-1');
    expect(stats.mostProductiveHour).toBeNull();
    expect(stats.averageEventDuration).toBe(0);
    expect(stats.workingDaysPerMonth).toBe(0);
  });

  it('calcula dias trabalhados por mês contando dias distintos por chave de mês', async () => {
    mockedPrisma.eventCollaborator.findMany
      .mockResolvedValueOnce([
        makeEvent({ booking: { eventDuration: 4, eventDate: new Date('2027-03-10T00:00:00Z') } }),
        makeEvent({ booking: { eventDuration: 4, eventDate: new Date('2027-03-20T00:00:00Z') } }),
        makeEvent({ booking: { eventDuration: 4, eventDate: new Date('2027-04-05T00:00:00Z') } }),
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const stats = await collaboratorRepository.getCollaboratorStats('collab-1');
    // Março: 2 dias distintos, Abril: 1 dia -> média (2+1)/2 = 1.5
    expect(stats.workingDaysPerMonth).toBe(1.5);
  });

  it('agrega avaliação média por mês (monthlyRatings), ignorando eventos sem nota', async () => {
    mockedPrisma.eventCollaborator.findMany
      .mockResolvedValueOnce([makeEvent()]) // getCollaboratorStats principal
      .mockResolvedValueOnce([]) // getMonthlyEarnings
      .mockResolvedValueOnce([
        { createdAt: new Date('2027-03-05T00:00:00Z'), rating: 5 },
        { createdAt: new Date('2027-03-20T00:00:00Z'), rating: 3 },
      ]); // getMonthlyRatings

    const stats = await collaboratorRepository.getCollaboratorStats('collab-1');
    expect(stats.monthlyRatings).toEqual([{ month: '2027-03', averageRating: 4 }]);
  });
});
