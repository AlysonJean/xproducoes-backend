/**
 * Migration Script: Generate Slugs for Existing Records
 * 
 * This script generates slugs for all Equipment, Kits, Portfolio, and Services
 * that don't have a slug yet.
 * 
 * Usage: npm run migrate:slugs
 */

import { PrismaClient } from '@prisma/client';
import { generateSlug } from '../utils/slug';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function generateUniqueSlug(
  baseSlug: string,
  model: 'equipment' | 'kit' | 'portfolio' | 'service'
): Promise<string> {
  let slug = baseSlug;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (exists && attempts < maxAttempts) {
    // Check if slug exists
    const existing = await (prisma[model] as any).findUnique({
      where: { slug }
    });

    if (!existing) {
      exists = false;
    } else {
      // Add random suffix
      slug = `${baseSlug}-${randomBytes(2).toString('hex')}`;
      attempts++;
    }
  }

  if (attempts >= maxAttempts) {
    throw new Error(`Failed to generate unique slug for: ${baseSlug}`);
  }

  return slug;
}

async function migrateEquipment() {
  console.log('\n🔧 Migrating Equipment...');
  
  const equipments = await prisma.equipment.findMany({
    where: { slug: null },
    select: { id: true, name: true }
  });

  console.log(`   Found ${equipments.length} equipment(s) without slug`);

  for (const equipment of equipments) {
    const baseSlug = generateSlug(equipment.name);
    const uniqueSlug = await generateUniqueSlug(baseSlug, 'equipment');
    
    await prisma.equipment.update({
      where: { id: equipment.id },
      data: { slug: uniqueSlug }
    });
    
    console.log(`   ✅ ${equipment.name} → ${uniqueSlug}`);
  }
}

async function migrateKits() {
  console.log('\n📦 Migrating Kits...');
  
  const kits = await prisma.kit.findMany({
    where: { slug: null },
    select: { id: true, name: true }
  });

  console.log(`   Found ${kits.length} kit(s) without slug`);

  for (const kit of kits) {
    const baseSlug = generateSlug(kit.name);
    const uniqueSlug = await generateUniqueSlug(baseSlug, 'kit');
    
    await prisma.kit.update({
      where: { id: kit.id },
      data: { slug: uniqueSlug }
    });
    
    console.log(`   ✅ ${kit.name} → ${uniqueSlug}`);
  }
}

async function migratePortfolio() {
  console.log('\n🖼️  Migrating Portfolio...');
  
  const portfolios = await prisma.portfolio.findMany({
    where: { slug: null },
    select: { id: true, title: true }
  });

  console.log(`   Found ${portfolios.length} portfolio item(s) without slug`);

  for (const portfolio of portfolios) {
    const baseSlug = generateSlug(portfolio.title);
    const uniqueSlug = await generateUniqueSlug(baseSlug, 'portfolio');
    
    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: { slug: uniqueSlug }
    });
    
    console.log(`   ✅ ${portfolio.title} → ${uniqueSlug}`);
  }
}

async function migrateServices() {
  console.log('\n🛠️  Migrating Services...');
  
  const services = await prisma.service.findMany({
    where: { slug: null },
    select: { id: true, name: true }
  });

  console.log(`   Found ${services.length} service(s) without slug`);

  for (const service of services) {
    const baseSlug = generateSlug(service.name);
    const uniqueSlug = await generateUniqueSlug(baseSlug, 'service');
    
    await prisma.service.update({
      where: { id: service.id },
      data: { slug: uniqueSlug }
    });
    
    console.log(`   ✅ ${service.name} → ${uniqueSlug}`);
  }
}

async function main() {
  console.log('🚀 Starting Slug Migration...\n');
  console.log('This will generate slugs for all existing records without one.');
  
  try {
    await migrateEquipment();
    await migrateKits();
    await migratePortfolio();
    await migrateServices();
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
