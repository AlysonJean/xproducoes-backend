// @ts-check

/**
 * @type {import('@prisma/config').PrismaConfig}
 */
const config = {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

module.exports = config;
