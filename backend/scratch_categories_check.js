import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { name: { in: ['Rice', 'Pickles', 'Detergents', 'Vegetables'] } }
    });
    console.log(JSON.stringify(categories, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
checkCategories();
