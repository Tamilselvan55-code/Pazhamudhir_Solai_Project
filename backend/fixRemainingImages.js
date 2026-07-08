/**
 * fixRemainingImages.js
 * Fixes the 18 products that weren't matched in fixProductImages.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tiruchendur_grocery';

const EXTRA_FIXES = [
  // Smart-quote variant of Lays India's Magic Masala
  { name: 'Lays India\u2019s Magic Masala', image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=600&q=80' },
  // Generic admin-added products
  { name: 'Lady Finger',       image: 'https://images.unsplash.com/photo-1627384113743-6bd5a479fffd?auto=format&fit=crop&w=600&q=80' },
  { name: 'Capsicum',          image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80' },
  { name: 'Fenugreek Leaves',  image: 'https://images.unsplash.com/photo-1575218823251-f9e1b5f58c5f?auto=format&fit=crop&w=600&q=80' },
  { name: 'Amaranth Greens',   image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80' },
  { name: 'Banana',            image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=600&q=80' },
  { name: 'Mango',             image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80' },
  { name: 'Apple',             image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6fac6?auto=format&fit=crop&w=600&q=80' },
  { name: 'Grapes',            image: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80' },
  { name: 'Fresh Milk',        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80' },
  { name: 'Curd',              image: 'https://images.unsplash.com/photo-1488477181272-a9e31a65f25c?auto=format&fit=crop&w=600&q=80' },
  { name: 'Paneer',            image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80' },
  { name: 'Butter',            image: 'https://images.unsplash.com/photo-1589985270958-bf087b3c42e0?auto=format&fit=crop&w=600&q=80' },
  { name: 'Cheese Slices',     image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=600&q=80' },
  { name: 'Murukku',           image: 'https://images.unsplash.com/photo-1630343710506-89f8b9f21d31?auto=format&fit=crop&w=600&q=80' },
  { name: 'Mixture',           image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' },
  { name: 'Biscuits',          image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80' },
  { name: 'Chips',             image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80' },
];

async function fixRemaining() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅ Connected to MongoDB for remaining image fixes...\n');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const fix of EXTRA_FIXES) {
    const product = await Product.findOne({ name: fix.name });

    if (!product) {
      console.log('❓ [NOT FOUND] "' + fix.name + '"');
      notFound++;
      continue;
    }

    if (product.image === fix.image) {
      console.log('✔️  [OK]       "' + fix.name + '" — already correct.');
      skipped++;
      continue;
    }

    await Product.collection.updateOne(
      { _id: product._id },
      { $set: { image: fix.image } }
    );
    console.log('🖼️  [FIXED]    "' + fix.name + '"');
    updated++;
  }

  console.log('\n='.repeat(50));
  console.log('✅ Fixed   : ' + updated);
  console.log('⏭️  Skipped : ' + skipped);
  console.log('❓ Missing  : ' + notFound);
  console.log('='.repeat(50));
  console.log('\n🎉 Done!\n');

  await mongoose.disconnect();
  process.exit(0);
}

fixRemaining().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
