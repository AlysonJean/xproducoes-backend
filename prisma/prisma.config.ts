import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    directory: './migrations'
  },
  url: process.env.DATABASE_URL,
  connectionString: process.env.DATABASE_URL
})