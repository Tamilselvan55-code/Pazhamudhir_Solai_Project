/**
 * updateSpecificImages.js
 * Updates ONLY the image field for the listed products.
 * Nothing else (name, price, stock, category, etc.) is touched.
 *
 * Run: node updateSpecificImages.js
 */

import prisma from './utils/prismaClient.js';
import dotenv from 'dotenv';

dotenv.config();

// ─── Targeted image corrections ──────────────────────────────────────────────
// Each entry: { name: <exact DB product name>, image: <correct Unsplash URL> }
// All images: square-friendly, clean background, no watermark, high resolution.
const TARGET_IMAGES = [

  // ── VEGETABLES ──────────────────────────────────────────────────────────────

  // Brinjal → Fresh Purple Brinjal / Eggplant
  {
    name: 'Brinjal',
    image: 'https://images.unsplash.com/photo-1659010952895-7d5e0af2febd?auto=format&fit=crop&w=600&q=80',
  },

  // Drumstick → Fresh Drumstick (Moringa pods)
  {
    name: 'Drumstick',
    image: 'https://images.unsplash.com/photo-1567367584887-8df2d7b2c9d4?auto=format&fit=crop&w=600&q=80',
  },

  // Cabbage → Fresh Green Cabbage
  {
    name: 'Cabbage',
    image: 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=600&q=80',
  },

  // Coriander Leaves → Fresh Coriander / Cilantro bunch
  {
    name: 'Coriander Leaves',
    image: 'https://images.unsplash.com/photo-1666762363816-f32e53ddb636?auto=format&fit=crop&w=600&q=80',
  },

  // Lady Finger (Okra)
  {
    name: 'Ladies Finger',
    image: 'https://images.unsplash.com/photo-1621239939862-dfea2e0bcf37?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Lady Finger',
    image: 'https://images.unsplash.com/photo-1621239939862-dfea2e0bcf37?auto=format&fit=crop&w=600&q=80',
  },

  // Bitter Gourd → Fresh Bitter Gourd / Bitter Melon
  {
    name: 'Bitter Gourd',
    image: 'https://images.unsplash.com/photo-1589983022889-5a40e3e8e68f?auto=format&fit=crop&w=600&q=80',
  },

  // Small Onion (Shallots) → Fresh shallots pile
  {
    name: 'Small Onion (Shallots)',
    image: 'https://images.unsplash.com/photo-1681584673987-d29571a32699?auto=format&fit=crop&w=600&q=80',
  },

  // Beetroot → Fresh beetroot
  {
    name: 'Beetroot',
    image: 'https://images.unsplash.com/photo-1643130793917-51de7f39e8d6?auto=format&fit=crop&w=600&q=80',
  },

  // Ridge Gourd → Fresh Ridge Gourd (ribbed/angled)
  {
    name: 'Ridge Gourd',
    image: 'https://images.unsplash.com/photo-1659010952895-7d5e0af2febd?auto=format&fit=crop&w=600&q=80',
  },

  // Yellow Pumpkin → Fresh yellow pumpkin / ash gourd slice
  {
    name: 'Yellow Pumpkin',
    image: 'https://images.unsplash.com/photo-1508361001413-7a9dca21d08a?auto=format&fit=crop&w=600&q=80',
  },

  // Green Chilli → Fresh green chillies
  {
    name: 'Green Chilli',
    image: 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=600&q=80',
  },

  // Ginger → Fresh ginger root
  {
    name: 'Ginger',
    image: 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?auto=format&fit=crop&w=600&q=80',
  },

  // French Beans / Beans → Fresh green beans
  {
    name: 'French Beans',
    image: 'https://images.unsplash.com/photo-1568584393003-33e8fdab0f65?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Beans',
    image: 'https://images.unsplash.com/photo-1568584393003-33e8fdab0f65?auto=format&fit=crop&w=600&q=80',
  },

  // White Radish → Fresh white daikon / radish
  {
    name: 'White Radish',
    image: 'https://images.unsplash.com/photo-1591105575516-6b4d16b4b5ea?auto=format&fit=crop&w=600&q=80',
  },

  // Cluster Beans → Fresh cluster beans (Guar)
  {
    name: 'Cluster Beans',
    image: 'https://images.unsplash.com/photo-1600346019001-8d56d1b51d59?auto=format&fit=crop&w=600&q=80',
  },

  // Broad Beans (Avarakkai)
  {
    name: 'Broad Beans',
    image: 'https://images.unsplash.com/photo-1616805765352-beba2d7bf2d3?auto=format&fit=crop&w=600&q=80',
  },

  // Ivy Gourd (Kovakkai) → small green oval gourds
  {
    name: 'Ivy Gourd',
    image: 'https://images.unsplash.com/photo-1601063476271-a159a00b5c50?auto=format&fit=crop&w=600&q=80',
  },

  // Ash Gourd (Vellai Poosani) → white ash gourd
  {
    name: 'Ash Gourd',
    image: 'https://images.unsplash.com/photo-1575909812264-6902b55846ad?auto=format&fit=crop&w=600&q=80',
  },

  // Chow Chow (Chayote) → green chayote squash
  {
    name: 'Chow Chow',
    image: 'https://images.unsplash.com/photo-1506807803488-8eafc15316c7?auto=format&fit=crop&w=600&q=80',
  },

  // ── FRUITS ──────────────────────────────────────────────────────────────────

  // Papaya → Fresh green/ripe papaya
  {
    name: 'Papaya',
    image: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=600&q=80',
  },

  // Apple → Fresh red apple (generic)
  {
    name: 'Apple',
    image: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?auto=format&fit=crop&w=600&q=80',
  },

  // Indian Apple → Indian Jujube / Ber / Elanthai Pazham
  {
    name: 'Indian Apple',
    image: 'https://images.unsplash.com/photo-1640451547528-3cde3fb26aaa?auto=format&fit=crop&w=600&q=80',
  },

  // Sweet Lime → Fresh Mosambi / Sweet lime
  {
    name: 'Sweet Lime',
    image: 'https://images.unsplash.com/photo-1587132134227-b2d00dfae580?auto=format&fit=crop&w=600&q=80',
  },

  // Guava → Fresh green guava
  {
    name: 'Guava',
    image: 'https://images.unsplash.com/photo-1616744830718-dbe48e9e7e9a?auto=format&fit=crop&w=600&q=80',
  },

  // Green Grapes → Fresh green seedless grapes
  {
    name: 'Green Grapes',
    image: 'https://images.unsplash.com/photo-1515779122185-2390ccdf060b?auto=format&fit=crop&w=600&q=80',
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function updateImages() {
  await prisma.$connect();
  console.log('\n✅ Connected to PostgreSQL via Prisma');
  console.log('🎯 Updating ' + TARGET_IMAGES.length + ' targeted product images...\n');
  console.log('='.repeat(68));

  let updated = 0;
  let alreadyCorrect = 0;
  let notFound = 0;

  for (const target of TARGET_IMAGES) {
    const product = await prisma.product.findFirst({ where: { name: target.name } });

    if (!product) {
      console.log('❓ [NOT FOUND]  "' + target.name + '"');
      notFound++;
      continue;
    }

    if (product.image === target.image) {
      console.log('✔️  [OK]         "' + target.name + '" — already correct.');
      alreadyCorrect++;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { image: target.image }
    });

    console.log('🖼️  [UPDATED]    "' + target.name + '"');
    console.log('    ▸ ' + target.image.substring(0, 72) + '...\n');
    updated++;
  }

  console.log('='.repeat(68));
  console.log('📊 Results:');
  console.log('   🖼️  Updated        : ' + updated);
  console.log('   ✔️  Already correct : ' + alreadyCorrect);
  console.log('   ❓  Not found       : ' + notFound);
  console.log('='.repeat(68));
  console.log('\n🎉 Done! Images updated instantly in Admin & User Panels.\n');

  await prisma.$disconnect();
  process.exit(0);
}

updateImages().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
