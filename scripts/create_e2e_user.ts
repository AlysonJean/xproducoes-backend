import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config as envConfig } from '../src/config/environment';

(async function main(){
  const email = 'e2e-admin@local';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    user = await prisma.user.create({ data: { name: 'E2E Admin', email, passwordHash, role: 'ADMIN' } as any });
    console.log('User created', user.id);
  } else {
    console.log('User exists', user.id);
  }
  const token = jwt.sign({ id: user.id, role: user.role }, envConfig.jwtSecret, { expiresIn: '7d' });
  console.log('TOKEN=' + token);
  process.exit(0);
})();
