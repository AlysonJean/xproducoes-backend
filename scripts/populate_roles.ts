import 'dotenv/config';
import { PrismaClient, UserRole, CollaboratorRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function hash(p: string) {
  return bcrypt.hash(p, 10);
}

async function upsertUser(email: string, name: string, password: string, role: UserRole) {
  const passwordHash = await hash(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const updated = await prisma.user.update({ where: { email }, data: { name, passwordHash, role, verified: true, isActive: true } });
    console.log('[populate] Usuário atualizado:', email);
    return updated;
  }
  const created = await prisma.user.create({ data: { name, email, passwordHash, role, verified: true, isActive: true } });
  console.log('[populate] Usuário criado:', email);
  return created;
}

async function ensureCollaborator(userId: string, role: CollaboratorRole, overrides: any = {}) {
  const existing = await prisma.collaborator.findUnique({ where: { userId } });
  if (existing) return existing;
  const data: any = {
    userId,
    collaboratorRole: role,
    specialties: overrides.specialties || ['Eventos ao vivo'],
    status: overrides.status || 'ACTIVE',
    experience: overrides.experience || '3 anos',
    hourlyRate: overrides.hourlyRate ? overrides.hourlyRate : undefined,
    languages: overrides.languages || ['pt-BR'],
  };
  if (data.hourlyRate) data.hourlyRate = prisma.$executeRaw`select 0`;
  const created = await prisma.collaborator.create({ data });
  console.log('[populate] Collaborator criado para userId:', userId, 'role:', role);
  return created;
}

async function main() {
  console.log('[populate] Iniciando...');

  // Cria/atualiza MANAGER e OPERATOR
  const manager = await upsertUser('manager@xproducoes.local', 'Gerente', 'manager123', UserRole.MANAGER);
  const operator = await upsertUser('operator@xproducoes.local', 'Operador', 'operator123', UserRole.OPERATOR);

  // Cria alguns clientes extras
  await upsertUser('cliente2@exemplo.com', 'Cliente Dois', 'cliente123', UserRole.CLIENT);
  await upsertUser('cliente3@exemplo.com', 'Cliente Tres', 'cliente123', UserRole.CLIENT);

  // Colaboradores com papéis variados
  const collab1 = await upsertUser('fotografo1@exemplo.com', 'Fotografo 1', 'collab123', UserRole.COLLABORATOR);
  const collab2 = await upsertUser('videografo1@exemplo.com', 'Videografo 1', 'collab123', UserRole.COLLABORATOR);
  const collab3 = await upsertUser('dj1@exemplo.com', 'DJ 1', 'collab123', UserRole.COLLABORATOR);
  const collab4 = await upsertUser('assistente1@exemplo.com', 'Assistente 1', 'collab123', UserRole.COLLABORATOR);

  // Criar perfis de collaborator
  try {
    await prisma.collaborator.createMany({
      data: [],
      skipDuplicates: true,
    });
  } catch (e) {
    // ignore
  }

  // Criar colaborator records individualmente (para garantir relations)
  const prismaCollab = await prisma.collaborator.findFirst();
  // Use create if not exists
  const exists1 = await prisma.collaborator.findUnique({ where: { userId: collab1.id } });
  if (!exists1) {
    await prisma.collaborator.create({ data: { userId: collab1.id, collaboratorRole: CollaboratorRole.PHOTOGRAPHER, specialties: ['Casamento'], status: 'ACTIVE', experience: '6 anos', languages: ['pt-BR'] } });
    console.log('[populate] Collaborator PHOTOGRAPHER criado para', collab1.email);
  }
  const exists2 = await prisma.collaborator.findUnique({ where: { userId: collab2.id } });
  if (!exists2) {
    await prisma.collaborator.create({ data: { userId: collab2.id, collaboratorRole: CollaboratorRole.VIDEOGRAPHER, specialties: ['Eventos corporativos'], status: 'ACTIVE', experience: '4 anos', languages: ['pt-BR'] } });
    console.log('[populate] Collaborator VIDEOGRAPHER criado para', collab2.email);
  }
  const exists3 = await prisma.collaborator.findUnique({ where: { userId: collab3.id } });
  if (!exists3) {
    await prisma.collaborator.create({ data: { userId: collab3.id, collaboratorRole: CollaboratorRole.DJ, specialties: ['Balada'], status: 'ACTIVE', experience: '5 anos', languages: ['pt-BR'] } });
    console.log('[populate] Collaborator DJ criado para', collab3.email);
  }
  const exists4 = await prisma.collaborator.findUnique({ where: { userId: collab4.id } });
  if (!exists4) {
    await prisma.collaborator.create({ data: { userId: collab4.id, collaboratorRole: CollaboratorRole.ASSISTANT, specialties: ['Logística'], status: 'ACTIVE', experience: '2 anos', languages: ['pt-BR'] } });
    console.log('[populate] Collaborator ASSISTANT criado para', collab4.email);
  }

  console.log('[populate] Concluído. Credenciais adicionais:');
  console.log('  Manager: manager@xproducoes.local / manager123');
  console.log('  Operator: operator@xproducoes.local / operator123');
  console.log('  Fotógrafo: fotografo1@exemplo.com / collab123');
  console.log('  Videógrafo: videografo1@exemplo.com / collab123');
  console.log('  DJ: dj1@exemplo.com / collab123');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('[populate] Falha:', e);
  await prisma.$disconnect();
  process.exit(1);
});
