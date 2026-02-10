
import { prisma } from '../config/prisma';
import { generateSlug } from '../utils/slug';
import { randomBytes } from 'crypto';

async function backfillSlugs() {
  console.log('🚀 Starting slug backfill...');

  // 1. Backfill Equipments
  const equipmentsWithoutSlug = await prisma.equipment.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' }
      ]
    }
  });

  console.log(`Found ${equipmentsWithoutSlug.length} equipments without slug.`);

  for (const eq of equipmentsWithoutSlug) {
    let slug = generateSlug(eq.name);
    
    // Check for collision
    const existing = await prisma.equipment.findFirst({
      where: { 
        slug,
        id: { not: eq.id } // exclude self
      }
    });

    if (existing) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    await prisma.equipment.update({
      where: { id: eq.id },
      data: { slug }
    });
    console.log(`✅ Updated equipment: ${eq.name} -> ${slug}`);
  }

  // 2. Backfill Kits
  const kitsWithoutSlug = await prisma.kit.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' }
      ]
    }
  });

  console.log(`Found ${kitsWithoutSlug.length} kits without slug.`);

  for (const kit of kitsWithoutSlug) {
    let slug = generateSlug(kit.name);
    
    // Check for collision
    const existing = await prisma.kit.findFirst({
      where: { 
        slug,
        id: { not: kit.id }
      }
    });

    if (existing) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    await prisma.kit.update({
      where: { id: kit.id },
      data: { slug }
    });
    console.log(`✅ Updated kit: ${kit.name} -> ${slug}`);
  }

  // 3. Backfill Portfolio
  const portfoliosWithoutSlug = await prisma.portfolio.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' }
      ]
    }
  });

  console.log(`Found ${portfoliosWithoutSlug.length} portfolios without slug.`);

  for (const item of portfoliosWithoutSlug) {
    let slug = generateSlug(item.title);
    
    // Check for collision
    const existing = await prisma.portfolio.findFirst({
      where: { 
        slug,
        id: { not: item.id }
      }
    });

    if (existing) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    await prisma.portfolio.update({
      where: { id: item.id },
      data: { slug }
    });
    console.log(`✅ Updated portfolio: ${item.title} -> ${slug}`);
  }

  // 4. Backfill Reviews
  const reviewsWithoutSlug = await prisma.review.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' }
      ]
    },
    include: { reviewer: true } // Need reviewer name
  });

  console.log(`Found ${reviewsWithoutSlug.length} reviews without slug.`);

  for (const review of reviewsWithoutSlug) {
    const baseName = review.reviewer?.name || 'cliente';
    let slug = generateSlug(`${baseName}-${review.rating}-estrelas`);
    
    // Check for collision
    const existing = await prisma.review.findFirst({
      where: { 
        slug,
        id: { not: review.id }
      }
    });

    if (existing) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    await prisma.review.update({
      where: { id: review.id },
      data: { slug }
    });
    console.log(`✅ Updated review: ${baseName} -> ${slug}`);
  }

  console.log('🎉 Backfill complete!');
}

backfillSlugs()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
