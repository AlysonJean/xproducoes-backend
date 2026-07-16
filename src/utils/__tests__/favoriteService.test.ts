import { jest } from '@jest/globals';
import { listFavorites, addFavorite, removeFavorite } from '../../services/favoriteService';
import { prisma } from '../../config/prisma';

jest.mock('../../config/prisma', () => ({
  prisma: {
    client: { upsert: jest.fn() },
    clientFavorite: { findMany: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
  },
}));

const mockedPrisma: any = (prisma as any);

// Achado (auditoria de produto): GET /user/favorites era um stub hardcoded sempre vazio
// ("rota temporária... evitar 404") — favoritos nunca persistiam no servidor. Este é o
// service real por trás das novas rotas POST/GET/DELETE /favorites.
describe('favoriteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.client.upsert.mockResolvedValue({ id: 'client-1' });
  });

  describe('listFavorites', () => {
    it('separa favoritos por tipo (equipment/kit/service), ignorando relações nulas', async () => {
      mockedPrisma.clientFavorite.findMany.mockResolvedValue([
        { equipment: { id: 'eq1', name: 'Caixa JBL' }, kit: null, service: null },
        { equipment: null, kit: { id: 'kit1', name: 'Kit Festa' }, service: null },
        { equipment: null, kit: null, service: { id: 'svc1', name: 'DJ' } },
      ]);

      const result = await listFavorites('user-1');

      expect(result).toEqual({
        equipments: [{ id: 'eq1', name: 'Caixa JBL' }],
        kits: [{ id: 'kit1', name: 'Kit Festa' }],
        services: [{ id: 'svc1', name: 'DJ' }],
      });
      expect(mockedPrisma.client.upsert).toHaveBeenCalledWith({ where: { userId: 'user-1' }, create: { userId: 'user-1' }, update: {} });
    });
  });

  describe('addFavorite', () => {
    it('cria favorito de equipamento usando upsert (idempotente)', async () => {
      await addFavorite('user-1', 'eq1', 'equipment');
      expect(mockedPrisma.clientFavorite.upsert).toHaveBeenCalledWith({
        where: { clientId_equipmentId: { clientId: 'client-1', equipmentId: 'eq1' } },
        create: { clientId: 'client-1', equipmentId: 'eq1' },
        update: {},
      });
    });

    it('cria favorito de kit', async () => {
      await addFavorite('user-1', 'kit1', 'kit');
      expect(mockedPrisma.clientFavorite.upsert).toHaveBeenCalledWith({
        where: { clientId_kitId: { clientId: 'client-1', kitId: 'kit1' } },
        create: { clientId: 'client-1', kitId: 'kit1' },
        update: {},
      });
    });

    it('rejeita itemType inválido', async () => {
      await expect(addFavorite('user-1', 'x1', 'invalido')).rejects.toThrow('Tipo de favorito inválido');
    });
  });

  describe('removeFavorite', () => {
    it('remove favorito de serviço', async () => {
      await removeFavorite('user-1', 'svc1', 'service');
      expect(mockedPrisma.clientFavorite.delete).toHaveBeenCalledWith({
        where: { clientId_serviceId: { clientId: 'client-1', serviceId: 'svc1' } },
      });
    });

    it('é idempotente — não lança erro quando o favorito já não existe', async () => {
      mockedPrisma.clientFavorite.delete.mockRejectedValue(new Error('Record not found'));
      await expect(removeFavorite('user-1', 'eq1', 'equipment')).resolves.toBeUndefined();
    });
  });
});
