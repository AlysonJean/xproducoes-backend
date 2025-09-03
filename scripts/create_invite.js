// Script de utilidade: cria um InviteToken no banco para testes locais
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'e2e-invite+' + Date.now() + '@example.com';
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dias

  const invite = await prisma.inviteToken.create({
    data: {
      token,
      email,
      invitedBy: null,
      used: false,
      expiresAt,
    },
  });

  console.log('Invite created:', { id: invite.id, email: invite.email, token: invite.token, expiresAt: invite.expiresAt });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
