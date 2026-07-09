import { jest } from '@jest/globals';
import { deleteUser, login, getProfile } from '../../services/userService';
import { prisma } from '../../config/prisma';

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');
const mockedPrisma: any = prisma as any;

// Achado (Fase 2.8a): deletar um usuário fazia um DELETE físico no banco
// (prisma.user.delete), quebrando a integridade referencial com reservas, pagamentos e
// avaliações já existentes (e impedindo qualquer auditoria posterior). Agora é um
// soft-delete: o registro permanece, isActive vira false, e login/refresh passam a
// recusar a conta.
describe('userService - soft-delete de usuário (isActive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deleteUser faz soft-delete (update isActive:false) em vez de apagar o registro', async () => {
    mockedPrisma.user.update.mockResolvedValue({ id: 'u1', isActive: false });

    await deleteUser('u1');

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { isActive: false },
    });
    expect(mockedPrisma.user.delete).not.toHaveBeenCalled();
  });

  it('login recusa uma conta desativada mesmo com a senha correta', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      email: 'inativo@example.com',
      passwordHash: 'hash',
      role: 'CLIENT',
      verified: true,
      isActive: false,
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(login({ email: 'inativo@example.com', password: 'correct' })).rejects.toThrow(/desativada/);
  });

  it('getProfile recusa (401) uma conta desativada — fecha o fluxo de refresh de token', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'u3',
      name: 'Fulano',
      email: 'inativo2@example.com',
      role: 'CLIENT',
      avatarUrl: null,
      isVip: false,
      isActive: false,
      createdAt: new Date(),
      googleCalendarEmail: null,
    });

    await expect(getProfile('u3')).rejects.toThrow(/desativada/);
  });

  it('getProfile retorna o perfil normalmente para conta ativa, sem expor o campo isActive', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'u4',
      name: 'Ciclana',
      email: 'ativo@example.com',
      role: 'CLIENT',
      avatarUrl: null,
      isVip: false,
      isActive: true,
      createdAt: new Date(),
      googleCalendarEmail: null,
    });

    const profile = await getProfile('u4');
    expect(profile).not.toHaveProperty('isActive');
    expect(profile).toMatchObject({ id: 'u4', email: 'ativo@example.com' });
  });
});
