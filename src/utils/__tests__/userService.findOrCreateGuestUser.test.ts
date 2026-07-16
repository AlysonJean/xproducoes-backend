import { jest } from '@jest/globals';
import { findOrCreateGuestUser } from '../../services/userService';
import { prisma } from '../../config/prisma';

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    client: {
      create: jest.fn(),
    },
  },
}));

const mockedPrisma: any = (prisma as any);

// Carrinho de convidado (checkout sem login prévio) — achado de auditoria de produto:
// o carrinho exigia autenticação em toda rota; findOrCreateGuestUser é o que permite
// criar a reserva sem cadastro prévio, criando (ou reaproveitando) a conta na hora.
describe('findOrCreateGuestUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reaproveita conta existente pelo e-mail, sem criar usuário novo', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', name: 'Cliente Existente', email: 'existente@teste.com', role: 'CLIENT',
    });

    const result = await findOrCreateGuestUser({ name: 'Nome Novo', email: 'existente@teste.com' });

    expect(result).toEqual({ id: 'u1', name: 'Cliente Existente', email: 'existente@teste.com', role: 'CLIENT', isNewAccount: false });
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
  });

  it('cria conta nova (CLIENT, verified:true) e perfil de cliente quando o e-mail não existe', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue({ id: 'u-novo', name: 'Convidado', email: 'novo@teste.com', role: 'CLIENT' });
    mockedPrisma.client.create.mockResolvedValue({ id: 'c-novo' });

    const result = await findOrCreateGuestUser({ name: 'Convidado', email: 'novo@teste.com', phone: '31999999999' });

    expect(result.isNewAccount).toBe(true);
    expect(mockedPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Convidado', email: 'novo@teste.com', role: 'CLIENT', verified: true }),
      })
    );
    expect(mockedPrisma.client.create).toHaveBeenCalledWith({ data: { userId: 'u-novo', phone: '31999999999' } });
  });

  it('não lança erro para o chamador quando a criação do perfil de cliente falha (só loga)', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue({ id: 'u-novo2', name: 'Convidado', email: 'novo2@teste.com', role: 'CLIENT' });
    mockedPrisma.client.create.mockRejectedValue(new Error('DB fora do ar'));

    await expect(findOrCreateGuestUser({ name: 'Convidado', email: 'novo2@teste.com' })).resolves.toMatchObject({ isNewAccount: true });
  });
});
