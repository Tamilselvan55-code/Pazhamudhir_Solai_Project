import prisma from './utils/prismaClient.js';
import dotenv from 'dotenv';

dotenv.config();

const DETERGENT_IMAGES = {
  'Surf Excel Easy Wash Powder': 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=600&q=80',
  'Rin Refresh Detergent Powder': 'https://images.unsplash.com/photo-1603555727313-b3b13de68b36?auto=format&fit=crop&w=600&q=80',
  'Ariel Matic Front Load Detergent': 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80',
  'Tide Plus Double Power Jasmine': 'https://images.unsplash.com/photo-1595231712425-60d19572655b?auto=format&fit=crop&w=600&q=80',
  'Wheel Active 2 in 1 Lemon & Jasmine': 'https://images.unsplash.com/photo-1563453392-2475950d2787?auto=format&fit=crop&w=600&q=80',
  'Henko Stain Champion Powder': 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=600&q=80',
  'Surf Excel Matic Liquid Detergent': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80',
  'Vim Lemon Dishwash Gel': 'https://images.unsplash.com/photo-1607006342411-92fc2a4d5c9e?auto=format&fit=crop&w=600&q=80',
  'Exo Touch & Shine Round Bar': 'https://images.unsplash.com/photo-1605264964528-06403738d6df?auto=format&fit=crop&w=600&q=80',
};

async function updateImages() {
  await prisma.$connect();
  console.log('✅ Connected to PostgreSQL via Prisma for detergent updates...');
  
  let count = 0;
  for (const [name, url] of Object.entries(DETERGENT_IMAGES)) {
    const product = await prisma.product.findFirst({ where: { name } });
    if (product) {
      await prisma.product.update({
        where: { id: product.id },
        data: { image: url }
      });
      console.log(`🖼️  Updated "${name}" to: ${url}`);
      count++;
    } else {
      console.log(`⚠️  Could not find product "${name}"`);
    }
  }
  
  console.log(`📊 Done! Updated ${count} products.`);
  await prisma.$disconnect();
  process.exit(0);
}

updateImages().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
