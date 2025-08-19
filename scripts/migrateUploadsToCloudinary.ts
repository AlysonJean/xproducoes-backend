import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { UploadService } from '../src/services/uploadService';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const uploadService = new UploadService();

async function fileExists(localPath: string) {
  try {
    await fs.promises.access(localPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function migrate() {
  const dryRun = process.argv.includes('--dry');
  const uploadsBase = process.env.UPLOAD_PATH ? path.resolve(process.env.UPLOAD_PATH) : path.resolve(__dirname, '../../uploads');
  console.log('[migrate] uploadsBase:', uploadsBase);

  // Equipamentos
  const equipments = await prisma.equipment.findMany({ select: { id: true, imageUrl: true } });
  for (const eq of equipments) {
    if (!eq.imageUrl || !eq.imageUrl.startsWith('/uploads')) continue;
    const localPath = path.join(uploadsBase, eq.imageUrl.replace(/^\/uploads\//, ''));
    if (!(await fileExists(localPath))) {
      console.warn('[migrate] arquivo não encontrado, pulando', localPath);
      continue;
    }
    console.log('[migrate] irá migrar equipamento', eq.id, '->', localPath);
    if (!dryRun) {
      const buffer = await fs.promises.readFile(localPath);
      const fakeFile: any = { buffer, mimetype: 'image/jpeg', originalname: path.basename(localPath) };
      try {
        const url = await uploadService.uploadImage(fakeFile, 'migrated');
        await prisma.equipment.update({ where: { id: eq.id }, data: { imageUrl: url } });
        console.log('[migrate] atualizado equipamento', eq.id);
      } catch (e) {
        console.error('[migrate] falha upload:', e);
      }
    }
  }

  // Kits
  const kits = await prisma.kit.findMany({ select: { id: true, imageUrl: true } });
  for (const k of kits) {
    if (!k.imageUrl || !k.imageUrl.startsWith('/uploads')) continue;
    const localPath = path.join(uploadsBase, k.imageUrl.replace(/^\/uploads\//, ''));
    if (!(await fileExists(localPath))) { console.warn('[migrate] arquivo não encontrado, pulando', localPath); continue; }
    console.log('[migrate] irá migrar kit', k.id, '->', localPath);
    if (!dryRun) {
      const buffer = await fs.promises.readFile(localPath);
      const fakeFile: any = { buffer, mimetype: 'image/jpeg', originalname: path.basename(localPath) };
      try {
        const url = await uploadService.uploadImage(fakeFile, 'migrated');
        await prisma.kit.update({ where: { id: k.id }, data: { imageUrl: url } });
        console.log('[migrate] atualizado kit', k.id);
      } catch (e) {
        console.error('[migrate] falha upload:', e);
      }
    }
  }

  // Portfolio
  const portfolios = await prisma.portfolio.findMany({ select: { id: true, imageUrl: true } });
  for (const p of portfolios) {
    if (!p.imageUrl || !p.imageUrl.startsWith('/uploads')) continue;
    const localPath = path.join(uploadsBase, p.imageUrl.replace(/^\/uploads\//, ''));
    if (!(await fileExists(localPath))) { console.warn('[migrate] arquivo não encontrado, pulando', localPath); continue; }
    console.log('[migrate] irá migrar portfolio', p.id, '->', localPath);
    if (!dryRun) {
      const buffer = await fs.promises.readFile(localPath);
      const fakeFile: any = { buffer, mimetype: 'image/jpeg', originalname: path.basename(localPath) };
      try {
        const url = await uploadService.uploadImage(fakeFile, 'migrated');
        await prisma.portfolio.update({ where: { id: p.id }, data: { imageUrl: url } });
        console.log('[migrate] atualizado portfolio', p.id);
      } catch (e) {
        console.error('[migrate] falha upload:', e);
      }
    }
  }

  console.log('[migrate] concluído');
  await prisma.$disconnect();
}

migrate().catch(async (e) => {
  console.error('Erro na migração:', e);
  await prisma.$disconnect();
  process.exit(1);
});
