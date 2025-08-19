const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const keys = Object.keys(p).filter(k => typeof p[k] === 'object');
    console.log('delegates:', keys.slice(0,200));
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
