
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Reproduction Script (ClientFavorite Relation) Started ---');
  
  // 1. Create a dummy category
  const category = await prisma.category.create({
    data: {
      name: 'Test Cat Fav ' + Date.now(),
      slug: 'test-cat-fav-' + Date.now(),
    }
  });

  // 2. Create equipment
  const equipment = await prisma.equipment.create({
    data: {
      name: 'To Be Deleted (Fav)',
      description: 'Test',
      imageUrl: 'http://test.com/img.jpg',
      pricePerHour: 10,
      quantity: 1,
      categoryId: category.id
    }
  });

  // 3. Create Client and User
  const user = await prisma.user.create({
    data: {
        email: 'test-fav-' + Date.now() + '@test.com',
        name: 'Test Fav',
        passwordHash: 'hash',
        role: 'CLIENT'
    }
  });
  
  const client = await prisma.client.create({
      data: {
          userId: user.id
      }
  });

  // 4. Create Favorite
  await prisma.clientFavorite.create({
      data: {
          clientId: client.id,
          equipmentId: equipment.id
      }
  });
  console.log(`Created favorite for equipment: ${equipment.id}`);

  // 5. Try to delete
  console.log('Attempting to delete equipment...');
  try {
    await prisma.equipment.delete({
      where: { id: equipment.id }
    });
    console.log('SUCCESS: Equipment deleted (Cascade worked)');
  } catch (error: any) {
    console.log('ERROR CAUGHT (Expected):');
    console.log(error.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
