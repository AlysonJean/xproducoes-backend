// Script para criar tabela app_settings no banco Neon
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAppSettings() {
  console.log('🔧 Sincronizando schema: app_settings...\n');

  try {
    // Tentar inserir usando Prisma Client
    const existing = await prisma.appSettings.findFirst({
      where: { id: 'default' }
    });

    if (existing) {
      console.log('✅ Registro padrão já existe');
      console.log(JSON.stringify(existing, null, 2));
    } else {
      const settings = await prisma.appSettings.create({
        data: {
          id: 'default',
          companyName: 'X Produçoes e Eventos',
          logoUrl: null
        }
      });
      console.log('✅ Registro padrão criado');
      console.log(JSON.stringify(settings, null, 2));
    }

    console.log('\n🎉 Schema sincronizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar schema:', error);
    
    // Se falhar, tentar criar a tabela com SQL
    console.log('\n🔧 Tentando criar tabela manualmente...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.app_settings (
          id TEXT PRIMARY KEY,
          logo_url TEXT,
          company_name TEXT NOT NULL DEFAULT 'X Produçoes e Eventos',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Tabela criada com SQL');
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.app_settings (id, company_name)
        VALUES ('default', 'X Produçoes e Eventos')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Registro inserido');
    } catch (sqlError) {
      console.error('❌ Erro ao criar com SQL:', sqlError);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAppSettings()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
