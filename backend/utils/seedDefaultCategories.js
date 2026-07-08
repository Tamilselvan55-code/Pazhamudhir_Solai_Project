import Category from '../models/Category.js';

const DEFAULT_CATEGORIES = [
  { name: 'Vegetables', tamilName: 'காய்கறிகள்', displayOrder: 1, isActive: true },
  { name: 'Fruits', tamilName: 'பழங்கள்', displayOrder: 2, isActive: true },
  { name: 'Dairy Products', tamilName: 'பால் பொருட்கள்', displayOrder: 3, isActive: true },
  { name: 'Biscuits', tamilName: 'பிஸ்கட்', displayOrder: 4, isActive: true },
  { name: 'Snacks', tamilName: 'தின்பண்டங்கள்', displayOrder: 5, isActive: true },
  { name: 'Masalas', tamilName: 'மசாலா', displayOrder: 6, isActive: true },
  { name: 'Oils', tamilName: 'சமையல் எண்ணெய்', displayOrder: 7, isActive: true },
  { name: 'Detergents', tamilName: 'சுத்திகரிப்பான்கள்', displayOrder: 8, isActive: true },
  { name: 'Pickles', tamilName: 'ஊறுகாய்', displayOrder: 9, isActive: true },
  { name: 'Coffee & Tea', tamilName: 'காபி & டீ', displayOrder: 10, isActive: true }
];

export async function ensureDefaultCategories() {
  try {
    const veg = await Category.findOne({ name: 'Vegetables' });
    if (!veg) {
      console.log('[Seed] Seeding default categories into MongoDB...');
      for (const def of DEFAULT_CATEGORIES) {
        await Category.updateOne(
          { name: def.name },
          { $setOnInsert: def },
          { upsert: true }
        );
      }
      console.log('[Seed] Default categories seeded successfully.');
    }
  } catch (err) {
    console.error('[Seed Error] Failed to seed default categories:', err);
  }
}
