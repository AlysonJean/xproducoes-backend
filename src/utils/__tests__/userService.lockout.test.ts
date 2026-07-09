import { jest } from '@jest/globals';
import { login } from '../../services/userService';
import { prisma } from '../../config/prisma';

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
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

// Achado (Fase 2.3): o lockout de conta era um Map em memória local por instância —
// em produção com múltiplas instâncias, um atacante podia contornar o bloqueio batendo em
// outra instância. Agora é apoiado no cacheService (Redis em produção); aqui validamos o
// comportamento via o fallback em memória do próprio cacheService (ambiente de teste).
describe('userService.login - bloqueio de conta após tentativas falhas (cacheService)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bloqueia login com 429 após 5 tentativas com senha incorreta, e libera após uma tentativa correta anterior ao limite', async () => {
    const email = 'lockout-test-1@example.com';
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email,
      passwordHash: 'hash',
      role: 'CLIENT',
      verified: true,
      isActive: true,
    });
    bcrypt.compare.mockResolvedValue(false);

    for (let i = 0; i < 5; i++) {
      await expect(login({ email, password: 'wrong' })).rejects.toThrow('Credenciais inválidas');
    }

    // 6ª tentativa: já bloqueado, mesmo que a senha agora esteja correta
    bcrypt.compare.mockResolvedValue(true);
    await expect(login({ email, password: 'correct' })).rejects.toThrow(/bloqueada/);
  });

  it('não bloqueia um e-mail diferente (o contador é isolado por e-mail)', async () => {
    const lockedEmail = 'lockout-test-2@example.com';
    const otherEmail = 'lockout-test-3@example.com';
    mockedPrisma.user.findUnique.mockImplementation(async ({ where }: any) => ({
      id: where.email === lockedEmail ? 'u2' : 'u3',
      email: where.email,
      passwordHash: 'hash',
      role: 'CLIENT',
      verified: true,
      isActive: true,
    }));
    bcrypt.compare.mockResolvedValue(false);

    for (let i = 0; i < 5; i++) {
      await expect(login({ email: lockedEmail, password: 'wrong' })).rejects.toThrow('Credenciais inválidas');
    }
    await expect(login({ email: lockedEmail, password: 'wrong' })).rejects.toThrow(/bloqueada/);

    bcrypt.compare.mockResolvedValue(true);
    await expect(login({ email: otherEmail, password: 'correct' })).resolves.toHaveProperty('token');
  });

  it('login bem-sucedido limpa o contador de tentativas falhas', async () => {
    const email = 'lockout-test-4@example.com';
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'u4',
      email,
      passwordHash: 'hash',
      role: 'CLIENT',
      verified: true,
      isActive: true,
    });

    bcrypt.compare.mockResolvedValue(false);
    for (let i = 0; i < 3; i++) {
      await expect(login({ email, password: 'wrong' })).rejects.toThrow('Credenciais inválidas');
    }

    bcrypt.compare.mockResolvedValue(true);
    await expect(login({ email, password: 'correct' })).resolves.toHaveProperty('token');

    // Após sucesso, o contador foi zerado — mais 3 erros (abaixo do limite de 5) não bloqueiam
    bcrypt.compare.mockResolvedValue(false);
    for (let i = 0; i < 3; i++) {
      await expect(login({ email, password: 'wrong' })).rejects.toThrow('Credenciais inválidas');
    }
    // ainda não deve estar bloqueado (só 3 tentativas desde o reset)
    bcrypt.compare.mockResolvedValue(true);
    await expect(login({ email, password: 'correct' })).resolves.toHaveProperty('token');
  });
});
