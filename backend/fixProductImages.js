/**
 * fixProductImages.js
 * Corrects all product images in MongoDB by matching product names to
 * accurate, specific Unsplash photo URLs.
 *
 * Run: node fixProductImages.js
 */

import prisma from './utils/prismaClient.js';
import dotenv from 'dotenv';

dotenv.config();

// All images: 600x600 friendly, clear product photo, white/natural bg
const CORRECT_IMAGES = {

  // ═══════════════════════════════════════════════════════
  // 1. VEGETABLES
  // ═══════════════════════════════════════════════════════
  'Tomato':
    'https://images.unsplash.com/photo-1546094096-0df4bcabd2e6?auto=format&fit=crop&w=600&q=80',
  'Potato':
    'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
  'Onion':
    'https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?auto=format&fit=crop&w=600&q=80',
  'Small Onion (Shallots)':
    'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=80',
  'Brinjal':
    'https://images.unsplash.com/photo-1503189236493-521cded24b3a?auto=format&fit=crop&w=600&q=80',
  'Drumstick':
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80',
  'Beetroot':
    'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=600&q=80',
  'Carrot':
    'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80',
  'Ladies Finger':
    'https://images.unsplash.com/photo-1627384113743-6bd5a479fffd?auto=format&fit=crop&w=600&q=80',
  'Bottle Gourd':
    'https://images.unsplash.com/photo-1630145397184-c8c226498529?auto=format&fit=crop&w=600&q=80',
  'Bitter Gourd':
    'https://images.unsplash.com/photo-1627308595229-7830a5c18b1c?auto=format&fit=crop&w=600&q=80',
  'Ridge Gourd':
    'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=600&q=80',
  'Snake Gourd':
    'https://images.unsplash.com/photo-1609142621730-db3293839541?auto=format&fit=crop&w=600&q=80',
  'Yellow Pumpkin':
    'https://images.unsplash.com/photo-1572989088340-05d3c5f84d0d?auto=format&fit=crop&w=600&q=80',
  'Raw Banana':
    'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
  'Green Chilli':
    'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
  'Ginger':
    'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
  'Cabbage':
    'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
  'Cauliflower':
    'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=80',
  'French Beans':
    'https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?auto=format&fit=crop&w=600&q=80',
  'White Radish':
    'https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=600&q=80',
  'Cluster Beans':
    'https://images.unsplash.com/photo-1591189863430-ab87e120f312?auto=format&fit=crop&w=600&q=80',
  'Broad Beans':
    'https://images.unsplash.com/photo-1564506678137-a9d2f67e2879?auto=format&fit=crop&w=600&q=80',
  'Ivy Gourd':
    'https://images.unsplash.com/photo-1628773822503-6e3e5bc875b3?auto=format&fit=crop&w=600&q=80',
  'Ash Gourd':
    'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80',
  'Chow Chow':
    'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80',
  'Coriander Leaves':
    'https://images.unsplash.com/photo-1599201994914-dc4d3a8ab751?auto=format&fit=crop&w=600&q=80',
  'Mint Leaves':
    'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?auto=format&fit=crop&w=600&q=80',
  'Curry Leaves':
    'https://images.unsplash.com/photo-1576181256399-834e3b3a49bf?auto=format&fit=crop&w=600&q=80',
  'Spinach':
    'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80',

  // ═══════════════════════════════════════════════════════
  // 2. FRUITS
  // ═══════════════════════════════════════════════════════
  'Indian Apple':
    'https://images.unsplash.com/photo-1560806887-1e4cd0b6fac6?auto=format&fit=crop&w=600&q=80',
  'Washington Apple':
    'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=600&q=80',
  'Alphonso Mango':
    'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80',
  'Banganapalli Mango':
    'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
  'Imam Pasand Mango':
    'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=600&q=80',
  'Rasalu Mango':
    'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=600&q=80',
  'Robusta Banana':
    'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=600&q=80',
  'Poovan Banana':
    'https://images.unsplash.com/photo-1543218024-57a70143c369?auto=format&fit=crop&w=600&q=80',
  'Nendran Banana':
    'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=600&q=80',
  'Red Banana':
    'https://images.unsplash.com/photo-1595475207225-428b62bda831?auto=format&fit=crop&w=600&q=80',
  'Orange':
    'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?auto=format&fit=crop&w=600&q=80',
  'Sweet Lime':
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
  'Pomegranate':
    'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=600&q=80',
  'Papaya':
    'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=600&q=80',
  'Watermelon':
    'https://images.unsplash.com/photo-1563114773-84221bd62daa?auto=format&fit=crop&w=600&q=80',
  'Pineapple':
    'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80',
  'Guava':
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
  'Green Grapes':
    'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80',

  // ═══════════════════════════════════════════════════════
  // 3. BISCUITS
  // ═══════════════════════════════════════════════════════
  'Good Day Butter Cookies':
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80',
  'Good Day Cashew Cookies':
    'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80',
  'Marie Gold Biscuit':
    'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=600&q=80',
  'Tiger Glucose Biscuit':
    'https://images.unsplash.com/photo-1587668178277-295251f900ce?auto=format&fit=crop&w=600&q=80',
  'Bourbon Chocolate Cream':
    'https://images.unsplash.com/photo-1548907994-25499ee79a78?auto=format&fit=crop&w=600&q=80',
  'Milk Bikis':
    'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&w=600&q=80',
  'Oreo Original Chocolate Cookies':
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=600&q=80',
  'Parle Hide & Seek Choco Rolls':
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
  'Britannia 50-50 Sweet & Salty':
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  'Monaco Salted Crackers':
    'https://images.unsplash.com/photo-1541014741259-de529411b96a?auto=format&fit=crop&w=600&q=80',
  'Krackjack Sweet & Salty Crackers':
    'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80',

  // ═══════════════════════════════════════════════════════
  // 4. MASALA (AACHI)
  // ═══════════════════════════════════════════════════════
  'Aachi Chicken Masala':
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
  'Aachi Mutton Masala':
    'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=600&q=80',
  'Aachi Sambar Powder':
    'https://images.unsplash.com/photo-1613727867023-e41cdf8d2ac6?auto=format&fit=crop&w=600&q=80',
  'Aachi Rasam Powder':
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80',
  'Aachi Chilli Powder':
    'https://images.unsplash.com/photo-1508615070457-7baeba4003ab?auto=format&fit=crop&w=600&q=80',
  'Aachi Turmeric Powder':
    'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=600&q=80',
  'Aachi Coriander Powder':
    'https://images.unsplash.com/photo-1609540586408-b7c02e1d0a69?auto=format&fit=crop&w=600&q=80',
  'Aachi Garam Masala':
    'https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=600&q=80',
  'Aachi Biryani Masala':
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
  'Aachi Pepper Powder':
    'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=600&q=80',

  // ═══════════════════════════════════════════════════════
  // 5. PICKLES
  // ═══════════════════════════════════════════════════════
  'Aachi Cut Mango Pickle':
    'https://images.unsplash.com/photo-1589133914023-e18d6a8a4819?auto=format&fit=crop&w=600&q=80',
  'Aachi Lemon Pickle':
    'https://images.unsplash.com/photo-1597714026720-8f74c62310ba?auto=format&fit=crop&w=600&q=80',
  'Aachi Garlic Pickle':
    'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
  'Aachi Mixed Vegetable Pickle':
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
  'Aachi Tomato Pickle':
    'https://images.unsplash.com/photo-1546094096-0df4bcabd2e6?auto=format&fit=crop&w=600&q=80',
  'Aachi Ginger Pickle':
    'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
  'Aachi Gooseberry Pickle':
    'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=80',
  'Aachi Green Chilli Pickle':
    'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',

  // ═══════════════════════════════════════════════════════
  // 6. DETERGENTS
  // ═══════════════════════════════════════════════════════
  'Surf Excel Easy Wash Powder':
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
  'Rin Refresh Detergent Powder':
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80',
  'Ariel Matic Front Load Detergent':
    'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=600&q=80',
  'Tide Plus Double Power Jasmine':
    'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80',
  'Wheel Active 2 in 1 Lemon & Jasmine':
    'https://images.unsplash.com/photo-1585737431915-53c780e5e9e4?auto=format&fit=crop&w=600&q=80',
  'Henko Stain Champion Powder':
    'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80',
  'Surf Excel Matic Liquid Detergent':
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
  'Vim Lemon Dishwash Gel':
    'https://images.unsplash.com/photo-1585837575651-1a63c6317d0d?auto=format&fit=crop&w=600&q=80',
  'Exo Touch & Shine Round Bar':
    'https://images.unsplash.com/photo-1585737431915-53c780e5e9e4?auto=format&fit=crop&w=600&q=80',

  // ═══════════════════════════════════════════════════════
  // 7. DAIRY
  // ═══════════════════════════════════════════════════════
  'Aavin Green Standardized Milk':
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
  'Aavin Blue Toned Milk':
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  'Arokya Full Cream Milk':
    'https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&w=600&q=80',
  'Fresh Farm Curd':
    'https://images.unsplash.com/photo-1488477181272-a9e31a65f25c?auto=format&fit=crop&w=600&q=80',
  'Amul Fresh Paneer Cubes':
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
  'Amul Pasteurized Butter':
    'https://images.unsplash.com/photo-1589985270958-bf087b3c42e0?auto=format&fit=crop&w=600&q=80',
  'Amul Cheese Slices':
    'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=600&q=80',
  'Aavin Pure Cow Ghee':
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80',
  'Spiced Buttermilk':
    'https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&w=600&q=80',
  'Cavins Rose Flavoured Milk':
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  'Milky Mist Greek Yogurt':
    'https://images.unsplash.com/photo-1488477181272-a9e31a65f25c?auto=format&fit=crop&w=600&q=80',

  // ═══════════════════════════════════════════════════════
  // 8. SNACKS
  // ═══════════════════════════════════════════════════════
  'Lays Classic Salted Potato Chips':
    'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80',
  "Lays India's Magic Masala":
    'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=600&q=80',
  'Lays American Style Cream & Onion':
    'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80',
  'Lays Spanish Tomato Tango':
    'https://images.unsplash.com/photo-1562447457-579fc34967fb?auto=format&fit=crop&w=600&q=80',
  'Kurkure Masala Munch':
    'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80',
  'Bingo Mad Angles Achaari Masti':
    'https://images.unsplash.com/photo-1528459105426-b9548367069b?auto=format&fit=crop&w=600&q=80',
  'Traditional South Indian Murukku':
    'https://images.unsplash.com/photo-1630343710506-89f8b9f21d31?auto=format&fit=crop&w=600&q=80',
  'Madras Spicy Mixture':
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',

  // ═══════════════════════════════════════════════════════
  // 9. COOKING OILS
  // ═══════════════════════════════════════════════════════
  'Gold Winner Refined Sunflower Oil':
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
  'Fortune Sunlite Sunflower Oil':
    'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=600&q=80',
  'Traditional Cold Pressed Groundnut Oil':
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
  'Idhayam Gingelly Oil (Sesame)':
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80',
  'VVD Gold Pure Coconut Oil':
    'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80',
  'Freedom Rice Bran Oil':
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
  'Fortune Kachi Ghani Mustard Oil':
    'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=600&q=80',
  'Ruchi Gold Palm Oil':
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
  'Anjali Cold Pressed Gingelly Oil':
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80',

  // ═══════════════════════════════════════════════════════
  // 10. OTHERS
  // ═══════════════════════════════════════════════════════
  'Garlic (Country Variety)':
    'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=600&q=80',
  'Fresh Mature Coconut':
    'https://images.unsplash.com/photo-1580984969071-a8da8d144f0e?auto=format&fit=crop&w=600&q=80',
  'Bru Instant Coffee Powder':
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
  'Nescafe Sunrise Rich Coffee':
    'https://images.unsplash.com/photo-1497935586047-9395ee065fd0?auto=format&fit=crop&w=600&q=80',
  '3 Roses Dust Tea Powder':
    'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=600&q=80',
  'Chakra Gold Premium Tea Powder':
    'https://images.unsplash.com/photo-1515696955266-4f67e13219e8?auto=format&fit=crop&w=600&q=80',
  'Organic Chemical-Free Jaggery':
    'https://images.unsplash.com/photo-1622484212850-2f80164c0175?auto=format&fit=crop&w=600&q=80',
  'Refined White Sugar':
    'https://images.unsplash.com/photo-1581375074612-d1fd0e661aeb?auto=format&fit=crop&w=600&q=80',
  'Tata Crystal Sea Salt':
    'https://images.unsplash.com/photo-1518110929396-2fe0de3c46be?auto=format&fit=crop&w=600&q=80',
  'Tata Vacuum Evaporated Iodized Salt':
    'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&w=600&q=80',
};

function getCorrectImage(name) {
  if (CORRECT_IMAGES[name]) return CORRECT_IMAGES[name];
  const nameLower = name.toLowerCase();
  for (const [key, url] of Object.entries(CORRECT_IMAGES)) {
    if (key.toLowerCase() === nameLower) return url;
  }
  return null;
}

async function fixImages() {
  await prisma.$connect();
  console.log('\n✅ Connected to PostgreSQL via Prisma');
  console.log('🔍 Scanning all products for incorrect images...\n');
  console.log('='.repeat(64));

  const allProducts = await prisma.product.findMany({});
  console.log('📦 Total products found: ' + allProducts.length + '\n');

  let updated = 0;
  let skipped = 0;
  let notMapped = 0;

  for (const product of allProducts) {
    const correctUrl = getCorrectImage(product.name);

    if (!correctUrl) {
      console.log('⚠️  [NO MAP]  "' + product.name + '" — not in correction list.');
      notMapped++;
      continue;
    }

    if (product.image === correctUrl) {
      console.log('✔️  [OK]      "' + product.name + '" — image already correct.');
      skipped++;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { image: correctUrl }
    });
    console.log('🖼️  [FIXED]   "' + product.name + '"');
    console.log('    Old: ' + product.image);
    console.log('    New: ' + correctUrl + '\n');
    updated++;
  }

  console.log('\n' + '='.repeat(64));
  console.log('📊 Summary:');
  console.log('   ✅ Fixed   : ' + updated + ' products');
  console.log('   ⏭️  Skipped : ' + skipped + ' (already correct)');
  console.log('   ⚠️  No map  : ' + notMapped + ' (not in list)');
  console.log('   📦 Total   : ' + allProducts.length);
  console.log('='.repeat(64));
  console.log('\n🎉 Image correction complete! Refresh the app to see changes.\n');

  await prisma.$disconnect();
  process.exit(0);
}

fixImages().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
