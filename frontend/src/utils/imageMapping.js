/**
 * Automatic High-Quality Professional Grocery Image Mapping
 * Matches product names/categories to professional transparent or clean-background images.
 */

const KEYWORD_IMAGE_MAP = [
  // ── VEGETABLES ──────────────────────────────────────────────────
  { keys: ['ladies finger', 'okra', 'bhindi'], image: 'https://images.unsplash.com/photo-1627917846513-e6d24dcbf456?auto=format&fit=crop&w=800&q=80' },
  { keys: ['brinjal', 'eggplant', 'aubergine'], image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=800&q=80' },
  { keys: ['tomato'], image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80' },
  { keys: ['onion'], image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80' },
  { keys: ['potato'], image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80' },
  { keys: ['carrot'], image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80' },
  { keys: ['beetroot', 'beet'], image: 'https://images.unsplash.com/photo-1593845014815-56543b599307?auto=format&fit=crop&w=800&q=80' },
  { keys: ['cabbage'], image: 'https://images.unsplash.com/photo-1593280443077-ae46e0100ad1?auto=format&fit=crop&w=800&q=80' },
  { keys: ['cauliflower'], image: 'https://images.unsplash.com/photo-1568584711075-3d68fd4c6225?auto=format&fit=crop&w=800&q=80' },
  { keys: ['broccoli'], image: 'https://images.unsplash.com/photo-1583663848850-46af132dc08e?auto=format&fit=crop&w=800&q=80' },
  { keys: ['green chilli', 'green chili'], image: 'https://images.unsplash.com/photo-1588102379374-2c40c7dc45b1?auto=format&fit=crop&w=800&q=80' },
  { keys: ['red chilli', 'red chili'], image: 'https://images.unsplash.com/photo-1585237885078-43e86c0c226f?auto=format&fit=crop&w=800&q=80' },
  { keys: ['garlic'], image: 'https://images.unsplash.com/photo-1615485984428-56903847e174?auto=format&fit=crop&w=800&q=80' },
  { keys: ['ginger'], image: 'https://images.unsplash.com/photo-1596396973343-6d0e65eb98f1?auto=format&fit=crop&w=800&q=80' },
  { keys: ['french beans', 'beans'], image: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?auto=format&fit=crop&w=800&q=80' },
  { keys: ['gourd', 'bottle gourd', 'snake gourd', 'bitter gourd'], image: 'https://images.unsplash.com/photo-1602715694729-0824bba7ef0a?auto=format&fit=crop&w=800&q=80' },
  { keys: ['pumpkin'], image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?auto=format&fit=crop&w=800&q=80' },
  { keys: ['radish'], image: 'https://images.unsplash.com/photo-1582294179374-4b5314ba6cf6?auto=format&fit=crop&w=800&q=80' },
  { keys: ['cucumber'], image: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=800&q=80' },
  { keys: ['curry leaves', 'mint', 'coriander', 'spinach', 'greens', 'keerai'], image: 'https://images.unsplash.com/photo-1605336647970-d8721c437a3b?auto=format&fit=crop&w=800&q=80' },
  { keys: ['drumstick'], image: 'https://images.unsplash.com/photo-1592864619760-b6e3f4bc7c2d?auto=format&fit=crop&w=800&q=80' },

  // ── FRUITS ──────────────────────────────────────────────────────
  { keys: ['apple', 'washington', 'indian apple'], image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6fac6?auto=format&fit=crop&w=800&q=80' },
  { keys: ['banana', 'yelakki', 'robusta', 'poovan'], image: 'https://images.unsplash.com/photo-1571501679680-de32f1e7aad4?auto=format&fit=crop&w=800&q=80' },
  { keys: ['mango', 'alphonso', 'banganapalli'], image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80' },
  { keys: ['orange', 'mosambi', 'sweet lime'], image: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=800&q=80' },
  { keys: ['pomegranate'], image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80' },
  { keys: ['watermelon'], image: 'https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?auto=format&fit=crop&w=800&q=80' },
  { keys: ['papaya'], image: 'https://images.unsplash.com/photo-1617112848504-7a32bd803734?auto=format&fit=crop&w=800&q=80' },
  { keys: ['pineapple'], image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=800&q=80' },
  { keys: ['grapes', 'grape'], image: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=800&q=80' },
  { keys: ['guava'], image: 'https://images.unsplash.com/photo-1615486171448-4720e17fc046?auto=format&fit=crop&w=800&q=80' },
  { keys: ['kiwi'], image: 'https://images.unsplash.com/photo-1585065406733-146da1b9ccb6?auto=format&fit=crop&w=800&q=80' },
  { keys: ['dragon fruit'], image: 'https://images.unsplash.com/photo-1555581977-1a48c48405d4?auto=format&fit=crop&w=800&q=80' },
  { keys: ['lemon'], image: 'https://images.unsplash.com/photo-1590502593747-42a996111139?auto=format&fit=crop&w=800&q=80' },
  { keys: ['cherry'], image: 'https://images.unsplash.com/photo-1528821128474-27f963b062bf?auto=format&fit=crop&w=800&q=80' },
  { keys: ['coconut'], image: 'https://images.unsplash.com/photo-1601334645065-9828ee53381e?auto=format&fit=crop&w=800&q=80' },
  
  // ── DAIRY ───────────────────────────────────────────────────────
  { keys: ['milk', 'aavin', 'arokya'], image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80' },
  { keys: ['curd', 'yogurt'], image: 'https://images.unsplash.com/photo-1571212515416-fef01b444fb8?auto=format&fit=crop&w=800&q=80' },
  { keys: ['butter'], image: 'https://images.unsplash.com/photo-1588195538328-4ce679a613f1?auto=format&fit=crop&w=800&q=80' },
  { keys: ['cheese', 'paneer'], image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80' },
  { keys: ['ghee'], image: 'https://images.unsplash.com/photo-1632731515904-7a13d3f9b2d8?auto=format&fit=crop&w=800&q=80' }, // using a rich oil/butter proxy

  // ── MASALAS ─────────────────────────────────────────────────────
  { keys: ['aachi', 'masala', 'spice', 'powder'], image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80' },

  // ── BISCUITS ────────────────────────────────────────────────────
  { keys: ['good day', 'marie gold', 'bourbon', 'oreo', 'tiger', 'milk bikis', '50-50', 'hide & seek', 'biscuit'], image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80' },

  // ── SNACKS ──────────────────────────────────────────────────────
  { keys: ['lays', 'kurkure', 'bingo', 'doritos', 'chips', 'snack'], image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=800&q=80' },

  // ── PICKLES ─────────────────────────────────────────────────────
  { keys: ['pickle', 'oorukai', 'jar'], image: 'https://images.unsplash.com/photo-1626200419188-f1530d4aad6e?auto=format&fit=crop&w=800&q=80' },

  // ── OILS ────────────────────────────────────────────────────────
  { keys: ['sunflower oil', 'groundnut oil', 'coconut oil', 'sesame oil', 'cooking oil'], image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80' },

  // ── COFFEE & TEA ────────────────────────────────────────────────
  { keys: ['coffee', 'bru', 'nescafe'], image: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=800&q=80' },
  { keys: ['tea', 'powder'], image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80' },
  { keys: ['boost', 'horlicks', 'health drink'], image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80' },

  // ── DETERGENTS ──────────────────────────────────────────────────
  { keys: ['surf excel', 'ariel', 'rin', 'wheel', 'ghadi', 'detergent', 'washing powder'], image: 'https://images.unsplash.com/photo-1585652643899-2708303f8f9e?auto=format&fit=crop&w=800&q=80' },

  // ── PERSONAL CARE ───────────────────────────────────────────────
  { keys: ['soap', 'shampoo', 'toothpaste', 'face wash', 'body wash', 'personal care', 'brush'], image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80' }
];

const FALLBACK_CATEGORY_IMAGES = {
  vegetables: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=800&q=80',
  fruits: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
  dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
  masala: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  biscuits: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80',
  snacks: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=800&q=80',
  pickles: 'https://images.unsplash.com/photo-1626200419188-f1530d4aad6e?auto=format&fit=crop&w=800&q=80',
  oils: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
  beverages: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
  detergents: 'https://images.unsplash.com/photo-1585652643899-2708303f8f9e?auto=format&fit=crop&w=800&q=80',
  personal: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
  cleaning: 'https://images.unsplash.com/photo-1584820927498-cafe4c148c90?auto=format&fit=crop&w=800&q=80',
};

/**
 * Gets the professional grocery image by analyzing the product name and category.
 */
export const getProfessionalProductImage = (productName, category, originalSrc) => {
  if (!productName) return originalSrc;
  
  const nameLower = productName.toLowerCase();
  
  // 1. Try to find exact/keyword match from product name
  for (const mapping of KEYWORD_IMAGE_MAP) {
    if (mapping.keys.some(key => nameLower.includes(key))) {
      return mapping.image;
    }
  }

  // 2. Fallback to category based generic image if original is broken or placeholder
  const catName = (typeof category === 'string' ? category : category?.name || category?.id || '').toLowerCase();
  
  if (catName) {
    if (catName.includes('veg')) return FALLBACK_CATEGORY_IMAGES.vegetables;
    if (catName.includes('fruit')) return FALLBACK_CATEGORY_IMAGES.fruits;
    if (catName.includes('dairy') || catName.includes('milk')) return FALLBACK_CATEGORY_IMAGES.dairy;
    if (catName.includes('masala')) return FALLBACK_CATEGORY_IMAGES.masala;
    if (catName.includes('biscuit') || catName.includes('cookie')) return FALLBACK_CATEGORY_IMAGES.biscuits;
    if (catName.includes('snack') || catName.includes('chips')) return FALLBACK_CATEGORY_IMAGES.snacks;
    if (catName.includes('pickle')) return FALLBACK_CATEGORY_IMAGES.pickles;
    if (catName.includes('oil')) return FALLBACK_CATEGORY_IMAGES.oils;
    if (catName.includes('detergent') || catName.includes('clean')) return FALLBACK_CATEGORY_IMAGES.detergents;
    if (catName.includes('personal') || catName.includes('care')) return FALLBACK_CATEGORY_IMAGES.personal;
    if (catName.includes('drink') || catName.includes('beverage')) return FALLBACK_CATEGORY_IMAGES.beverages;
  }

  // 3. Keep original if no match found (or return a generic supermarket photo)
  if (originalSrc && originalSrc.length > 5 && !originalSrc.includes('placeholder')) {
    return originalSrc;
  }

  return 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80';
};
