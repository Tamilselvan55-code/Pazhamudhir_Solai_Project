/**
 * updateProductImages2.js
 * Updates ONLY the image field for the listed products.
 * Every URL is a single isolated product on white/clean background.
 * NO shelves, NO baskets, NO collages, NO watermarks.
 *
 * Run: node updateProductImages2.js
 */

import prisma from './utils/prismaClient.js';
import dotenv from 'dotenv';

dotenv.config();

// ─── Each entry: exact DB product name → single-product Unsplash URL ─────────
const TARGET_IMAGES = [

  // ═══════════════════════════════════════════
  //  V E G E T A B L E S
  // ═══════════════════════════════════════════

  {
    name: 'Tomato',
    image: 'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Onion',
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Small Onion (Shallots)',
    image: 'https://images.unsplash.com/photo-1681584673987-d29571a32699?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Brinjal',
    image: 'https://images.unsplash.com/photo-1659010952895-7d5e0af2febd?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Drumstick',
    image: 'https://images.unsplash.com/photo-1567367584887-8df2d7b2c9d4?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Potato',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Carrot',
    image: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Beetroot',
    image: 'https://images.unsplash.com/photo-1643130793917-51de7f39e8d6?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Cabbage',
    image: 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Cauliflower',
    image: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Ladies Finger',
    image: 'https://images.unsplash.com/photo-1621239939862-dfea2e0bcf37?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Lady Finger',
    image: 'https://images.unsplash.com/photo-1621239939862-dfea2e0bcf37?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Bitter Gourd',
    image: 'https://images.unsplash.com/photo-1589983022889-5a40e3e8e68f?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Ridge Gourd',
    image: 'https://images.unsplash.com/photo-1625380560757-5aef35f5a5de?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Snake Gourd',
    image: 'https://images.unsplash.com/photo-1609142621730-db3293839541?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Bottle Gourd',
    image: 'https://images.unsplash.com/photo-1630145397184-c8c226498529?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Ash Gourd',
    image: 'https://images.unsplash.com/photo-1575909812264-6902b55846ad?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Chow Chow',
    image: 'https://images.unsplash.com/photo-1506807803488-8eafc15316c7?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Cluster Beans',
    image: 'https://images.unsplash.com/photo-1600346019001-8d56d1b51d59?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'French Beans',
    image: 'https://images.unsplash.com/photo-1568584393003-33e8fdab0f65?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Broad Beans',
    image: 'https://images.unsplash.com/photo-1616805765352-beba2d7bf2d3?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Green Peas',
    image: 'https://images.unsplash.com/photo-1506545992805-b4c7d48a3a8e?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Green Chilli',
    image: 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Capsicum',
    image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Coriander Leaves',
    image: 'https://images.unsplash.com/photo-1666762363816-f32e53ddb636?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Mint Leaves',
    image: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Spinach',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Amaranth Greens',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Curry Leaves',
    image: 'https://images.unsplash.com/photo-1576181256399-834e3b3a49bf?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Ginger',
    image: 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Garlic (Country Variety)',
    image: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Garlic',
    image: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Raw Banana',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=85',
  },

  // ═══════════════════════════════════════════
  //  F R U I T S
  // ═══════════════════════════════════════════

  {
    name: 'Papaya',
    image: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Apple',
    image: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Washington Apple',
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Indian Apple',
    image: 'https://images.unsplash.com/photo-1640451547528-3cde3fb26aaa?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Guava',
    image: 'https://images.unsplash.com/photo-1616744830718-dbe48e9e7e9a?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Sweet Lime',
    image: 'https://images.unsplash.com/photo-1587132134227-b2d00dfae580?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Orange',
    image: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Pomegranate',
    image: 'https://images.unsplash.com/photo-1541344999736-83eca272f6fc?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Banana',
    image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Robusta Banana',
    image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Poovan Banana',
    image: 'https://images.unsplash.com/photo-1543218024-57a70143c369?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Nendran Banana',
    image: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Red Banana',
    image: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Watermelon',
    image: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Mango',
    image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Alphonso Mango',
    image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Banganapalli Mango',
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Pineapple',
    image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Green Grapes',
    image: 'https://images.unsplash.com/photo-1515779122185-2390ccdf060b?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Grapes',
    image: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Black Grapes',
    image: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=85',
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────
async function run() {
  await prisma.$connect();
  console.log('\n✅ Connected to PostgreSQL via Prisma');
  console.log('🎯 Processing ' + TARGET_IMAGES.length + ' products...\n');
  console.log('═'.repeat(70));

  let updated = 0, correct = 0, missing = 0;

  for (const t of TARGET_IMAGES) {
    const prod = await prisma.product.findFirst({ where: { name: t.name } });
    if (!prod) {
      console.log('❓ NOT FOUND  → "' + t.name + '"');
      missing++;
      continue;
    }
    if (prod.image === t.image) {
      console.log('✔  OK        → "' + t.name + '"');
      correct++;
      continue;
    }
    await prisma.product.update({
      where: { id: prod.id },
      data: { image: t.image }
    });
    console.log('🖼  UPDATED   → "' + t.name + '"');
    updated++;
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🖼  Updated  : ' + updated);
  console.log('✔  Correct  : ' + correct);
  console.log('❓  Missing  : ' + missing);
  console.log('═'.repeat(70));
  console.log('\n🎉 All done — images live in Admin & User panels immediately.\n');

  await prisma.$disconnect();
  process.exit(0);
}

run().catch(e => { console.error('❌', e); process.exit(1); });
