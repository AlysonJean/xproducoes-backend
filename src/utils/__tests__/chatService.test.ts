import { jest } from '@jest/globals';
import { getOrCreateEventChat } from '../../services/chatService';
import { prisma } from '../../config/prisma';

jest.mock('../../config/prisma', () => ({
  prisma: {
    booking: { findUnique: jest.fn() },
    chat: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    chatParticipant: { upsert: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));

const mockedPrisma: any = (prisma as any);

const baseBooking = {
  id: 'b1',
  eventTitle: 'Casamento Silva',
  creatorId: 'client-1',
  eventCollaborators: [],
};

// Achado (auditoria de produto): o chat operacional do evento só adicionava o criador da
// reserva como participante quando ele era ADMIN/MANAGER — o cliente dono real do evento
// nunca entrava no próprio chat. Extraído de bookingStatusService.syncEventChat para também
// ser chamado sob demanda (cliente inicia a conversa antes da confirmação).
describe('chatService.getOrCreateEventChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
    mockedPrisma.chat.findUnique.mockResolvedValue({ id: 'chat-1', participants: [] });
  });

  it('retorna null quando a reserva não existe', async () => {
    mockedPrisma.booking.findUnique.mockResolvedValue(null);
    const result = await getOrCreateEventChat('nao-existe');
    expect(result).toBeNull();
    expect(mockedPrisma.chat.create).not.toHaveBeenCalled();
  });

  it('cria o chat incluindo sempre o cliente criador da reserva como participante', async () => {
    mockedPrisma.booking.findUnique.mockResolvedValue(baseBooking);
    mockedPrisma.chat.findFirst.mockResolvedValue(null);
    mockedPrisma.chat.create.mockResolvedValue({ id: 'chat-1' });

    await getOrCreateEventChat('b1');

    expect(mockedPrisma.chat.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'EVENT',
          bookingId: 'b1',
          participants: {
            create: expect.arrayContaining([{ userId: 'client-1' }, { userId: 'admin-1' }]),
          },
        }),
      })
    );
  });

  it('inclui colaboradores escalados como participantes', async () => {
    mockedPrisma.booking.findUnique.mockResolvedValue({
      ...baseBooking,
      eventCollaborators: [{ collaborator: { userId: 'collab-1' } }],
    });
    mockedPrisma.chat.findFirst.mockResolvedValue(null);
    mockedPrisma.chat.create.mockResolvedValue({ id: 'chat-1' });

    await getOrCreateEventChat('b1');

    const createCall = mockedPrisma.chat.create.mock.calls[0][0];
    const participantIds = createCall.data.participants.create.map((p: { userId: string }) => p.userId);
    expect(participantIds).toEqual(expect.arrayContaining(['client-1', 'collab-1', 'admin-1']));
  });

  it('quando o chat já existe, faz upsert dos participantes em vez de criar um novo', async () => {
    mockedPrisma.booking.findUnique.mockResolvedValue(baseBooking);
    mockedPrisma.chat.findFirst.mockResolvedValue({ id: 'chat-existente' });

    await getOrCreateEventChat('b1');

    expect(mockedPrisma.chat.create).not.toHaveBeenCalled();
    expect(mockedPrisma.chatParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { chatId_userId: { chatId: 'chat-existente', userId: 'client-1' } },
      })
    );
  });
});
