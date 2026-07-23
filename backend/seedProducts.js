import prisma from './utils/prismaClient.js';

const CATEGORIES_DATA = [
  { name: 'Vegetables', tamilName: 'காய்கறிகள்', displayOrder: 1 },
  { name: 'Fruits', tamilName: 'பழங்கள்', displayOrder: 2 },
  { name: 'Dairy Products', tamilName: 'பால் பொருட்கள்', displayOrder: 3 },
  { name: 'Biscuits', tamilName: 'பிஸ்கட்', displayOrder: 4 },
  { name: 'Snacks', tamilName: 'தின்பண்டங்கள்', displayOrder: 5 },
  { name: 'Masalas', tamilName: 'மசாலா', displayOrder: 6 },
  { name: 'Oils', tamilName: 'சமையல் எண்ணெய்', displayOrder: 7 },
  { name: 'Detergents', tamilName: 'சுத்திகரிப்பான்கள்', displayOrder: 8 },
  { name: 'Pickles', tamilName: 'ஊறுகாய்', displayOrder: 9 },
  { name: 'Coffee & Tea', tamilName: 'காபி & டீ', displayOrder: 10 },
  { name: 'Rice', tamilName: 'அரிசி', displayOrder: 11 },
  { name: 'Flour', tamilName: 'மாவு வகைகள்', displayOrder: 12 },
  { name: 'Soap', tamilName: 'சோப்பு', displayOrder: 13 },
  { name: 'Beverages', tamilName: 'பானங்கள்', displayOrder: 15 }
];

const main = async () => {
  console.log('--- STARTING PRODUCTS SEEDING ---');

  // 1. Ensure all categories exist
  const categoriesMap = {};
  for (const cat of CATEGORIES_DATA) {
    let dbCat = await prisma.category.findUnique({ where: { name: cat.name } });
    if (!dbCat) {
      dbCat = await prisma.category.create({
        data: {
          name: cat.name,
          tamilName: cat.tamilName,
          displayOrder: cat.displayOrder,
          isActive: true
        }
      });
      console.log(`Created Category: ${cat.name}`);
    } else {
      console.log(`Category Exists: ${cat.name}`);
    }
    // Map both Name and Slug for safety
    const slug = cat.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    categoriesMap[slug] = dbCat;
  }

  // Helper to generate products list
  const productsToSeed = [];

  // --- VEGETABLES (30) ---
  const vegetables = [
    { name: 'Tomato', tamil: 'தக்காளி', price: 40, unit: '1 kg' },
    { name: 'Onion', tamil: 'வெங்காயம்', price: 50, unit: '1 kg' },
    { name: 'Potato', tamil: 'உருளைக்கிழங்கு', price: 35, unit: '1 kg' },
    { name: 'Brinjal', tamil: 'கத்திரிக்காய்', price: 45, unit: '1 kg' },
    { name: 'Carrot', tamil: 'கேரட்', price: 60, unit: '1 kg' },
    { name: 'Beetroot', tamil: 'பீட்ரூட்', price: 48, unit: '1 kg' },
    { name: 'Ladies Finger', tamil: 'வெண்டைக்காய்', price: 40, unit: '1 kg' },
    { name: 'Drumstick', tamil: 'முருங்கைக்காய்', price: 80, unit: '1 kg' },
    { name: 'Cabbage', tamil: 'முட்டைக்கோஸ்', price: 30, unit: '1 kg' },
    { name: 'Cauliflower', tamil: 'காலிஃபிளவர்', price: 45, unit: '1 piece' },
    { name: 'Green Chilli', tamil: 'பச்சை மிளகாய்', price: 70, unit: '1 kg' },
    { name: 'Ginger', tamil: 'இஞ்சி', price: 120, unit: '1 kg' },
    { name: 'Garlic', tamil: 'பூண்டு', price: 150, unit: '1 kg' },
    { name: 'Coriander Leaves', tamil: 'கொத்தமல்லி தழை', price: 15, unit: '1 bunch' },
    { name: 'Mint Leaves', tamil: 'புதினா தழை', price: 15, unit: '1 bunch' },
    { name: 'Curry Leaves', tamil: 'கறிவேப்பிலை', price: 10, unit: '1 bunch' },
    { name: 'Lemon', tamil: 'எலுமிச்சை', price: 5, unit: '1 piece' },
    { name: 'Cucumber', tamil: 'வெள்ளரிக்காய்', price: 30, unit: '1 kg' },
    { name: 'Bottle Gourd', tamil: 'சுரைக்காய்', price: 25, unit: '1 piece' },
    { name: 'Bitter Gourd', tamil: 'பாகற்காய்', price: 50, unit: '1 kg' },
    { name: 'Snake Gourd', tamil: 'புடலங்காய்', price: 35, unit: '1 kg' },
    { name: 'Ridge Gourd', tamil: 'பீர்க்கங்காய்', price: 40, unit: '1 kg' },
    { name: 'Radish', tamil: 'முள்ளங்கி', price: 30, unit: '1 kg' },
    { name: 'Sweet Potato', tamil: 'சர்க்கரைவள்ளி கிழங்கு', price: 45, unit: '1 kg' },
    { name: 'Pumpkin', tamil: 'பூசணிக்காய்', price: 25, unit: '1 kg' },
    { name: 'Broad Beans', tamil: 'அவரைக்காய்', price: 50, unit: '1 kg' },
    { name: 'Beans', tamil: 'பீன்ஸ்', price: 75, unit: '1 kg' },
    { name: 'Capsicum', tamil: 'குடைமிளகாய்', price: 65, unit: '1 kg' },
    { name: 'Plantain Flower', tamil: 'வாழைப்பூ', price: 20, unit: '1 piece' },
    { name: 'Plantain Stem', tamil: 'வாழைத்தண்டு', price: 15, unit: '1 piece' }
  ];
  vegetables.forEach((v, idx) => {
    productsToSeed.push({
      name: v.name,
      tamilName: v.tamil,
      nameTamil: v.tamil,
      price: v.price,
      unit: v.unit,
      categorySlug: 'vegetables',
      categoryId: categoriesMap['vegetables'].id,
      image: null,
      stock: 50 + idx,
      description: `Fresh organic ${v.name} directly from farms.`
    });
  });

  // --- FRUITS (20) ---
  const fruits = [
    { name: 'Apple Royal Gala', tamil: 'ஆப்பிள் ராயல் காலா', price: 180, unit: '1 kg' },
    { name: 'Banana Robusta', tamil: 'வாழைப்பழம் ரோபஸ்டா', price: 60, unit: '1 dozen' },
    { name: 'Banana Yelakki', tamil: 'ஏலக்கி வாழைப்பழம்', price: 90, unit: '1 dozen' },
    { name: 'Mango Alphonso', tamil: 'அல்போன்சா மாம்பழம்', price: 150, unit: '1 kg' },
    { name: 'Orange Imported', tamil: 'ஆரஞ்சு', price: 120, unit: '1 kg' },
    { name: 'Pomegranate', tamil: 'மாதுளம்பழம்', price: 160, unit: '1 kg' },
    { name: 'Papaya', tamil: 'பப்பாளிப்பழம்', price: 40, unit: '1 kg' },
    { name: 'Watermelon', tamil: 'தர்பூசணி', price: 30, unit: '1 kg' },
    { name: 'Pineapple', tamil: 'அன்னாசிப்பழம்', price: 50, unit: '1 piece' },
    { name: 'Sweet Lime', tamil: 'சாத்துக்குடி', price: 80, unit: '1 kg' },
    { name: 'Guava', tamil: 'கொய்யாப்பழம்', price: 60, unit: '1 kg' },
    { name: 'Grapes Seedless', tamil: 'திராட்சை விதை இல்லாதது', price: 100, unit: '1 kg' },
    { name: 'Green Grapes', tamil: 'பச்சை திராட்சை', price: 90, unit: '1 kg' },
    { name: 'Sapota', tamil: 'சப்போட்டா', price: 70, unit: '1 kg' },
    { name: 'Jackfruit', tamil: 'பலாப்பழம்', price: 80, unit: '1 kg' },
    { name: 'Muskmelon', tamil: 'முலாம் பழம்', price: 50, unit: '1 kg' },
    { name: 'Plums', tamil: 'பிளம்ஸ்', price: 200, unit: '1 kg' },
    { name: 'Kiwi Imported', tamil: 'கிவி பழம்', price: 45, unit: '1 piece' },
    { name: 'Custard Apple', tamil: 'சீதாப்பழம்', price: 90, unit: '1 kg' },
    { name: 'Dragon Fruit', tamil: 'டிராகன் பழம்', price: 80, unit: '1 piece' }
  ];
  fruits.forEach((f, idx) => {
    productsToSeed.push({
      name: f.name,
      tamilName: f.tamil,
      nameTamil: f.tamil,
      price: f.price,
      unit: f.unit,
      categorySlug: 'fruits',
      categoryId: categoriesMap['fruits'].id,
      image: null,
      stock: 40 + idx,
      description: `Delicious and sweet ${f.name} naturally ripened.`
    });
  });

  // --- OILS (10) ---
  const oils = [
    { name: 'Gold Winner Sunflower Oil', tamil: 'சூரியகாந்தி எண்ணெய்', price: 145, unit: '1 L' },
    { name: 'Idhayam Sesame Oil', tamil: 'நல்லெண்ணெய்', price: 380, unit: '1 L' },
    { name: 'Parachute Coconut Oil', tamil: 'தேங்காய் எண்ணெய்', price: 220, unit: '1 L' },
    { name: 'VSL Groundnut Oil', tamil: 'கடலை எண்ணெய்', price: 210, unit: '1 L' },
    { name: 'Fortune Mustard Oil', tamil: 'கடுகு எண்ணெய்', price: 175, unit: '1 L' },
    { name: 'Olive Oil Pomace', tamil: 'ஆலிவ் எண்ணெய்', price: 650, unit: '1 L' },
    { name: 'Heritage Cow Ghee', tamil: 'பசு நெய்', price: 630, unit: '1 L' },
    { name: 'Rice Bran Oil', tamil: 'தவிடு எண்ணெய்', price: 160, unit: '1 L' },
    { name: 'Gingelly Oil Premium', tamil: 'எள் நல்லெண்ணெய்', price: 340, unit: '1 L' },
    { name: 'Castor Oil Pure', tamil: 'விளக்கெண்ணெய்', price: 95, unit: '200 ml' }
  ];
  oils.forEach((o, idx) => {
    productsToSeed.push({
      name: o.name,
      tamilName: o.tamil,
      nameTamil: o.tamil,
      price: o.price,
      unit: o.unit,
      categorySlug: 'oils',
      categoryId: categoriesMap['oils'].id,
      image: null,
      stock: 30 + idx,
      description: `High quality ${o.name} for healthy cooking.`
    });
  });

  // --- PICKLES (10) ---
  const pickles = [
    { name: 'Mango Pickle', tamil: 'மாங்காய் ஊறுகாய்', price: 65, unit: '200g' },
    { name: 'Lemon Pickle', tamil: 'எலுமிச்சை ஊறுகாய்', price: 60, unit: '200g' },
    { name: 'Garlic Pickle', tamil: 'பூண்டு ஊறுகாய்', price: 75, unit: '200g' },
    { name: 'Mixed Vegetable Pickle', tamil: 'காய்கறி ஊறுகாய்', price: 65, unit: '200g' },
    { name: 'Citron Pickle (Narthangai)', tamil: 'நாரத்தங்காய் ஊறுகாய்', price: 70, unit: '200g' },
    { name: 'Ginger Pickle (Inji)', tamil: 'இஞ்சி ஊறுகாய்', price: 70, unit: '200g' },
    { name: 'Tomato Pickle', tamil: 'தக்காளி ஊறுகாய்', price: 60, unit: '200g' },
    { name: 'Amla Pickle', tamil: 'நெல்லிக்காய் ஊறுகாய்', price: 75, unit: '200g' },
    { name: 'Green Chilli Pickle', tamil: 'பச்சை மிளகாய் ஊறுகாய்', price: 65, unit: '200g' },
    { name: 'Bitter Gourd Pickle', tamil: 'பாகற்காய் ஊறுகாய்', price: 80, unit: '200g' }
  ];
  pickles.forEach((p, idx) => {
    productsToSeed.push({
      name: p.name,
      tamilName: p.tamil,
      nameTamil: p.tamil,
      price: p.price,
      unit: p.unit,
      categorySlug: 'pickles',
      categoryId: categoriesMap['pickles'].id,
      image: null,
      stock: 25 + idx,
      description: `Spicy and tangy traditional home-style ${p.name}.`
    });
  });

  // --- BISCUITS (10) ---
  const biscuits = [
    { name: 'Parle-G Gluco Biscuits', tamil: 'பார்லே-ஜி பிஸ்கட்', price: 10, unit: '150g' },
    { name: 'Britannia Good Day Cashew', tamil: 'குட் டே பிஸ்கட்', price: 30, unit: '200g' },
    { name: 'Britannia Marie Gold', tamil: 'மேரி கோல்டு பிஸ்கட்', price: 25, unit: '250g' },
    { name: 'Oreo Chocolate Cream', tamil: 'ஓரியோ பிஸ்கட்', price: 35, unit: '120g' },
    { name: 'Britannia Bourbon', tamil: 'பர்பன் பிஸ்கட்', price: 30, unit: '150g' },
    { name: 'Sunfeast Dark Fantasy', tamil: 'டார்க் ஃபேண்டஸி', price: 40, unit: '100g' },
    { name: 'Sunfeast Mom’s Magic', tamil: 'மாம்ஸ் மேஜிக்', price: 30, unit: '150g' },
    { name: 'Parle Hide & Seek', tamil: 'ஹைட் & சீக்', price: 35, unit: '120g' },
    { name: 'Britannia Milk Bikis', tamil: 'மில்க் பிகிஸ்', price: 20, unit: '150g' },
    { name: 'Britannia 50-50 Maska Chaska', tamil: 'மஸ்கா சஸ்கா பிஸ்கட்', price: 25, unit: '150g' }
  ];
  biscuits.forEach((b, idx) => {
    productsToSeed.push({
      name: b.name,
      tamilName: b.tamil,
      nameTamil: b.tamil,
      price: b.price,
      unit: b.unit,
      categorySlug: 'biscuits',
      categoryId: categoriesMap['biscuits'].id,
      image: null,
      stock: 45 + idx,
      description: `Crunchy and tasty ${b.name} snack.`
    });
  });

  // --- SNACKS (10) ---
  const snacks = [
    { name: 'Potato Chips Salted', tamil: 'உருளைக்கிழங்கு சிப்ஸ்', price: 30, unit: '100g' },
    { name: 'Traditional Murukku', tamil: 'கை முறுக்கு', price: 45, unit: '200g' },
    { name: 'Madras Mixture', tamil: 'மெட்ராஸ் மிக்சர்', price: 50, unit: '250g' },
    { name: 'Kara Boondi', tamil: 'கார பூந்தி', price: 45, unit: '200g' },
    { name: 'Banana Chips Pepper', tamil: 'வாழைக்காய் சிப்ஸ்', price: 60, unit: '200g' },
    { name: 'Ribbon Pakoda', tamil: 'ரிப்பன் பக்கோடா', price: 45, unit: '200g' },
    { name: 'Masala Peanuts', tamil: 'மசாலா வேர்க்கடலை', price: 35, unit: '150g' },
    { name: 'Thattai Snacks', tamil: 'தட்டை', price: 50, unit: '200g' },
    { name: 'Omapodi', tamil: 'ஓமப்பொடி', price: 40, unit: '200g' },
    { name: 'Haldiram’s Bhujia Sev', tamil: 'பூஜியா சேவ்', price: 55, unit: '150g' }
  ];
  snacks.forEach((s, idx) => {
    productsToSeed.push({
      name: s.name,
      tamilName: s.tamil,
      nameTamil: s.tamil,
      price: s.price,
      unit: s.unit,
      categorySlug: 'snacks',
      categoryId: categoriesMap['snacks'].id,
      image: null,
      stock: 35 + idx,
      description: `Perfect tea-time snack ${s.name}.`
    });
  });

  // --- DAIRY PRODUCTS (10) ---
  const dairy = [
    { name: 'Aavin Green Milk Premium', tamil: 'ஆவின் பால் (பச்சை)', price: 23, unit: '500 ml' },
    { name: 'Amul Salted Butter', tamil: 'அமுல் வெண்ணெய்', price: 55, unit: '100g' },
    { name: 'Amul Paneer Fresh', tamil: 'பன்னீர்', price: 95, unit: '200g' },
    { name: 'Aavin Curd Packet', tamil: 'தயிர்', price: 35, unit: '500g' },
    { name: 'Amul Cheese Slices', tamil: 'சீஸ் ஸ்லைஸ்', price: 140, unit: '200g' },
    { name: 'Milky Mist Fresh Paneer', tamil: 'மில்கி மிஸ்ட் பன்னீர்', price: 110, unit: '200g' },
    { name: 'Amul Taaza Milk Tetrapack', tamil: 'அமுல் டசா பால்', price: 74, unit: '1 L' },
    { name: 'Aavin Ghee Jar', tamil: 'பசு நெய்', price: 340, unit: '500 ml' },
    { name: 'Milky Mist Set Curd Cup', tamil: 'தயிர் கப்', price: 40, unit: '400g' },
    { name: 'Amul Fresh Whipping Cream', tamil: 'ப்ரெஷ் கிரீம்', price: 120, unit: '250 ml' }
  ];
  dairy.forEach((d, idx) => {
    productsToSeed.push({
      name: d.name,
      tamilName: d.tamil,
      nameTamil: d.tamil,
      price: d.price,
      unit: d.unit,
      categorySlug: 'dairy-products',
      categoryId: categoriesMap['dairy-products'].id,
      image: null,
      stock: 20 + idx,
      description: `Fresh and healthy dairy product: ${d.name}.`
    });
  });

  // --- DETERGENTS (10) ---
  const detergents = [
    { name: 'Surf Excel Easy Wash', tamil: 'சர்ப் எக்செல்', price: 110, unit: '1 kg' },
    { name: 'Rin Detergent Powder', tamil: 'ரின் பவுடர்', price: 80, unit: '1 kg' },
    { name: 'Ariel Complete Powder', tamil: 'ஏரியல் பவுடர்', price: 220, unit: '1 kg' },
    { name: 'Vim Dishwash Liquid Gel', tamil: 'விம் ஜெல்', price: 55, unit: '250 ml' },
    { name: 'Comfort Fabric Conditioner', tamil: 'கம்ஃபர்ட் லிக்விட்', price: 60, unit: '220 ml' },
    { name: 'Pril Liquid Dishwash', tamil: 'பிரில் லிக்விட்', price: 65, unit: '220 ml' },
    { name: 'Dettol Antiseptic Liquid', tamil: 'டெட்டால் கிருமிநாசினி', price: 199, unit: '500 ml' },
    { name: 'Lizol Floor Cleaner Citrus', tamil: 'லைசால் தரை சுத்திகரிப்பான்', price: 180, unit: '975 ml' },
    { name: 'Harpic Toilet Cleaner', tamil: 'ஹார்பிக் டாய்லெட் கிளீனர்', price: 105, unit: '500 ml' },
    { name: 'Rin Detergent Soap Bar', tamil: 'ரின் சோப்பு', price: 10, unit: '150g' }
  ];
  detergents.forEach((det, idx) => {
    productsToSeed.push({
      name: det.name,
      tamilName: det.tamil,
      nameTamil: det.tamil,
      price: det.price,
      unit: det.unit,
      categorySlug: 'detergents',
      categoryId: categoriesMap['detergents'].id,
      image: null,
      stock: 40 + idx,
      description: `Effective cleaning agent: ${det.name}.`
    });
  });

  // --- COFFEE & TEA (10) ---
  const coffee = [
    { name: 'Narasus Udhayam Coffee', tamil: 'நரசுஸ் உதயம் காபி', price: 95, unit: '200g' },
    { name: 'Bru Instant Coffee Powder', tamil: 'புரூ இன்ஸ்டன்ட் காபி', price: 180, unit: '200g' },
    { name: '3 Roses Dust Tea', tamil: '3 ரோஸஸ் டீ தூள்', price: 140, unit: '250g' },
    { name: 'Taj Mahal Premium Tea', tamil: 'தாஜ் மஹால் டீ தூள்', price: 190, unit: '250g' },
    { name: 'Cothas Coffee Traditional', tamil: 'கொதாஸ் காபி தூள்', price: 110, unit: '200g' },
    { name: 'Nescafe Classic Instant', tamil: 'நெஸ்கஃபே கிளாசிக்', price: 210, unit: '100g' },
    { name: 'Tata Tea Chakra Gold', tamil: 'சக்ரா கோல்ட் டீ', price: 155, unit: '250g' },
    { name: 'Red Label Tea Natural Care', tamil: 'ரெட் லேபிள் டீ', price: 165, unit: '250g' },
    { name: 'AVT Premium Dust Tea', tamil: 'ஏவிடி பிரீமியம் டீ', price: 130, unit: '250g' },
    { name: 'Green Tea Honey Lemon', tamil: 'பச்சை தேயிலை', price: 145, unit: '25 bags' }
  ];
  coffee.forEach((c, idx) => {
    productsToSeed.push({
      name: c.name,
      tamilName: c.tamil,
      nameTamil: c.tamil,
      price: c.price,
      unit: c.unit,
      categorySlug: 'coffee-and-tea',
      categoryId: categoriesMap['coffee-&--tea'] ? categoriesMap['coffee-&--tea'].id : categoriesMap['coffee-and-tea'].id,
      image: null,
      stock: 35 + idx,
      description: `Refreshing ${c.name} for daily energy.`
    });
  });

  // --- MASALAS (10) ---
  const masalas = [
    { name: 'Aachi Sambar Powder', tamil: 'ஆச்சி சாம்பார் தூள்', price: 65, unit: '200g' },
    { name: 'Aachi Garam Masala', tamil: 'ஆச்சி கரம் மசாலா', price: 40, unit: '100g' },
    { name: 'Turmeric Powder Pure', tamil: 'மஞ்சள் தூள்', price: 30, unit: '100g' },
    { name: 'Chilli Powder Extra Hot', tamil: 'மிளகாய் தூள்', price: 55, unit: '200g' },
    { name: 'Sakthi Coriander Powder', tamil: 'மல்லித் தூள்', price: 45, unit: '200g' },
    { name: 'Aachi Chicken Masala', tamil: 'சிக்கன் மசாலா தூள்', price: 45, unit: '100g' },
    { name: 'Aachi Mutton Masala', tamil: 'மட்டன் மசாலா தூள்', price: 45, unit: '100g' },
    { name: 'Sakthi Biryani Masala', tamil: 'பிரியாணி மசாலா', price: 48, unit: '100g' },
    { name: 'Aachi Kulambu Milagai Thool', tamil: 'குழம்பு மிளகாய் தூள்', price: 70, unit: '200g' },
    { name: 'Sakthi Pepper Powder', tamil: 'மிளகுத் தூள்', price: 60, unit: '100g' }
  ];
  masalas.forEach((m, idx) => {
    productsToSeed.push({
      name: m.name,
      tamilName: m.tamil,
      nameTamil: m.tamil,
      price: m.price,
      unit: m.unit,
      categorySlug: 'masalas',
      categoryId: categoriesMap['masalas'].id,
      image: null,
      stock: 50 + idx,
      description: `Authentic traditional South Indian spice mix: ${m.name}.`
    });
  });

  // --- RICE (10) ---
  const rice = [
    { name: 'Ponni Boiled Rice Premium', tamil: 'பொன்னி புழுங்கல் அரிசி', price: 620, unit: '10 kg' },
    { name: 'Basmati Rice India Gate', tamil: 'பாஸ்மதி அரிசி', price: 160, unit: '1 kg' },
    { name: 'Raw Rice (Pachai Arisi)', tamil: 'பச்சரிசி', price: 55, unit: '1 kg' },
    { name: 'Idli Rice Gundu Arisi', tamil: 'இட்லி அரிசி', price: 45, unit: '1 kg' },
    { name: 'Brown Rice Organic', tamil: 'கைக்குத்தல் அரிசி', price: 90, unit: '1 kg' },
    { name: 'Jeeraga Samba Rice', tamil: 'சீரக சம்பா அரிசி', price: 140, unit: '1 kg' },
    { name: 'Sona Masoori Rice', tamil: 'சோனா மசூரி அரிசி', price: 65, unit: '1 kg' },
    { name: 'Seeraga Samba Briyani Rice', tamil: 'பிரியாணி சீரக சம்பா', price: 680, unit: '5 kg' },
    { name: 'Karuppu Kavuni Rice', tamil: 'கருப்பு கவுனி அரிசி', price: 190, unit: '1 kg' },
    { name: 'Mapillai Samba Rice', tamil: 'மாப்பிள்ளை சம்பா அரிசி', price: 120, unit: '1 kg' }
  ];
  rice.forEach((r, idx) => {
    productsToSeed.push({
      name: r.name,
      tamilName: r.tamil,
      nameTamil: r.tamil,
      price: r.price,
      unit: r.unit,
      categorySlug: 'rice',
      categoryId: categoriesMap['rice'].id,
      image: null,
      stock: 30 + idx,
      description: `High-yield natural healthy grains: ${r.name}.`
    });
  });

  // --- FLOUR (10) ---
  const flour = [
    { name: 'Aashirvaad Shudh Chakki Atta', tamil: 'கோதுமை மாவு', price: 65, unit: '1 kg' },
    { name: 'Maida Premium Quality', tamil: 'மைதா மாவு', price: 50, unit: '1 kg' },
    { name: 'Rice Flour (Arisi Maavu)', tamil: 'அரிசி மாவு', price: 45, unit: '1 kg' },
    { name: 'Ragi Flour (Finger Millet)', tamil: 'ராகி மாவு', price: 55, unit: '1 kg' },
    { name: 'Gram Flour (Besan)', tamil: 'கடலை மாவு', price: 90, unit: '1 kg' },
    { name: 'Bajra Flour (Pearl Millet)', tamil: 'கம்பு மாவு', price: 60, unit: '1 kg' },
    { name: 'Semolina (Sooji Rava)', tamil: 'ரவா', price: 60, unit: '1 kg' },
    { name: 'Wheat Rava Medium', tamil: 'கோதுமை ரவை', price: 65, unit: '1 kg' },
    { name: 'Corn Flour Thickener', tamil: 'சோள மாவு', price: 40, unit: '500g' },
    { name: 'Multi Grain Atta', tamil: 'மல்டிகிரைன் கோதுமை மாவு', price: 80, unit: '1 kg' }
  ];
  flour.forEach((fl, idx) => {
    productsToSeed.push({
      name: fl.name,
      tamilName: fl.tamil,
      nameTamil: fl.tamil,
      price: fl.price,
      unit: fl.unit,
      categorySlug: 'flour',
      categoryId: categoriesMap['flour'].id,
      image: null,
      stock: 40 + idx,
      description: `High-nutrition milled ${fl.name} for standard baking & recipes.`
    });
  });

  // --- SOAP (10) ---
  const soap = [
    { name: 'Dettol Liquid Handwash Refill', tamil: 'டெட்டால் ஹேண்ட்வாஷ்', price: 99, unit: '175 ml' },
    { name: 'Santoor Sandal Bath Soap', tamil: 'சந்தூர் சோப்பு', price: 35, unit: '125g' },
    { name: 'Dettol Original Soap Bar', tamil: 'டெட்டால் சோப்பு', price: 45, unit: '125g' },
    { name: 'Lifebuoy Total Soap Bar', tamil: 'லைஃப்பாய் சோப்பு', price: 30, unit: '125g' },
    { name: 'Hammam Neem Soap Bar', tamil: 'ஹமாம் வேம்பு சோப்பு', price: 40, unit: '150g' },
    { name: 'Lux Soft Touch Rose Soap', tamil: 'லக்ஸ் சோப்பு', price: 35, unit: '125g' },
    { name: 'Medimix Ayurvedic Soap', tamil: 'மேடிமிக்ஸ் சோப்பு', price: 40, unit: '125g' },
    { name: 'Margo Pure Neem Soap', tamil: 'மார்கோ சோப்பு', price: 35, unit: '125g' },
    { name: 'Godrej No.1 Sandal Soap', tamil: 'கோத்ரெஜ் சோப்பு', price: 30, unit: '100g' },
    { name: 'Dove Cream Bathing Bar', tamil: 'டவ் சோப்பு', price: 65, unit: '100g' }
  ];
  soap.forEach((sp, idx) => {
    productsToSeed.push({
      name: sp.name,
      tamilName: sp.tamil,
      nameTamil: sp.tamil,
      price: sp.price,
      unit: sp.unit,
      categorySlug: 'soap',
      categoryId: categoriesMap['soap'].id,
      image: null,
      stock: 50 + idx,
      description: `Refreshing hygiene wash: ${sp.name}.`
    });
  });


  // --- BEVERAGES (10) ---
  const beverages = [
    { name: 'Maaza Mango Drink Juice', tamil: 'மாசா மாம்பழ சாறு', price: 40, unit: '600 ml' },
    { name: 'Tropicana Orange Juice Juice', tamil: 'ஆரஞ்சு சாறு', price: 110, unit: '1 L' },
    { name: 'Coca Cola Soft Drink', tamil: 'கோகோ கோலா', price: 40, unit: '750 ml' },
    { name: 'Sprite Soft Drink Lime', tamil: 'ஸ்ப்ரைட்', price: 40, unit: '750 ml' },
    { name: 'Pepsi Soft Drink', tamil: 'பெப்சி', price: 38, unit: '750 ml' },
    { name: 'Kinley Mineral Water bottle', tamil: 'கின்லி குடிநீர்', price: 20, unit: '1 L' },
    { name: 'Paper Boat Mango Aamras', tamil: 'பேப்பர் போட் மாம்பழ சாறு', price: 35, unit: '250 ml' },
    { name: 'Real Mixed Fruit Juice', tamil: 'ரியல் பழச்சாறு', price: 115, unit: '1 L' },
    { name: '7Up Soft Drink Lemon', tamil: '7அப் குளிர்பானம்', price: 40, unit: '750 ml' },
    { name: 'Red Bull Energy Drink', tamil: 'ரெட் புல் எனர்ஜி டிரிங்க்', price: 125, unit: '250 ml' }
  ];
  beverages.forEach((bev, idx) => {
    productsToSeed.push({
      name: bev.name,
      tamilName: bev.tamil,
      nameTamil: bev.tamil,
      price: bev.price,
      unit: bev.unit,
      categorySlug: 'beverages',
      categoryId: categoriesMap['beverages'].id,
      image: null,
      stock: 45 + idx,
      description: `Cold refreshing beverage: ${bev.name}.`
    });
  });

  // 2. Perform bulk insertions
  console.log(`Prepared ${productsToSeed.length} products to seed.`);
  
  let insertedCount = 0;
  for (const prod of productsToSeed) {
    const existing = await prisma.product.findFirst({
      where: {
        name: prod.name,
        categorySlug: prod.categorySlug
      }
    });
    
    if (!existing) {
      await prisma.product.create({ data: prod });
      insertedCount++;
    }
  }

  console.log(`Successfully seeded ${insertedCount} new products!`);
  console.log('--- SEEDING COMPLETED ---');
};

main()
  .catch((err) => {
    console.error('Seeding crashed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
