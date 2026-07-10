import dotenv from 'dotenv';
import prisma from './utils/prismaClient.js';
import { cleanAndConvertTamilName } from './utils/migrateTamilNames.js';

dotenv.config();

const PRODUCTS = [
  // ─── 1. VEGETABLES (Approx 30 products) ───────────────────────────────────────
  {
    name: 'Tomato',
    nameTamil: '(Thakkali)',
    category: 'vegetables',
    price: 40,
    unit: '1 kg',
    description: 'Fresh red country tomatoes, rich in vitamin C and antioxidants.',
    stock: 150,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    offerTag: 'FRESH',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Potato',
    nameTamil: '(Urulaikizhangu)',
    category: 'vegetables',
    price: 35,
    unit: '1 kg',
    description: 'Premium Ooty potatoes, versatile for fries, curries, and mash.',
    stock: 200,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Onion',
    nameTamil: '(Vengayam)',
    category: 'vegetables',
    price: 30,
    unit: '1 kg',
    description: 'Dry red Nasik onions with sharp flavor and long shelf life.',
    stock: 250,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Small Onion (Shallots)',
    nameTamil: '(Chinna Vengayam)',
    category: 'vegetables',
    price: 70,
    unit: '500 g',
    description: 'Traditional South Indian small onions, essential for authentic sambar.',
    stock: 100,
    inStock: true,
    isActive: true,
    isTrending: true,
    offerTag: 'LOCAL',
    image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Brinjal',
    nameTamil: '(Kathirikkai)',
    category: 'vegetables',
    price: 35,
    unit: '500 g',
    description: 'Fresh purple tender brinjals ideal for ennai kathirikkai curry.',
    stock: 80,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Drumstick',
    nameTamil: '(Murungakkai)',
    category: 'vegetables',
    price: 25,
    unit: '4 pcs',
    description: 'Farm fresh farm drumsticks packed with minerals and dietary fiber.',
    stock: 90,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Beetroot',
    nameTamil: '(Beetroot)',
    category: 'vegetables',
    price: 45,
    unit: '500 g',
    description: 'Deep red sweet beetroots full of essential iron and nutrients.',
    stock: 75,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1593105544563-3fd10fe6eb9f?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Carrot',
    nameTamil: '(Carrot)',
    category: 'vegetables',
    price: 50,
    unit: '500 g',
    description: 'Crunchy sweet orange Ooty carrots great for salads and poriyal.',
    stock: 120,
    inStock: true,
    isActive: true,
    offerTag: '5% OFF',
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Ladies Finger',
    nameTamil: '(Vendakkai)',
    category: 'vegetables',
    price: 40,
    unit: '500 g',
    description: 'Tender green ladies finger, crisp and perfect for stir fries.',
    stock: 85,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1591633565975-f78f82462e35?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Bottle Gourd',
    nameTamil: '(Suraikkai)',
    category: 'vegetables',
    price: 30,
    unit: '1 pc',
    description: 'Hydrating bottle gourd, excellent for kootu and healthy juices.',
    stock: 50,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1630145397184-c8c226498529?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Bitter Gourd',
    nameTamil: '(Pavakkai)',
    category: 'vegetables',
    price: 45,
    unit: '500 g',
    description: 'Fresh dark green bitter gourds known for blood sugar regulation.',
    stock: 60,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1627308595229-7830a5c18b1c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Ridge Gourd',
    nameTamil: '(Peerkangai)',
    category: 'vegetables',
    price: 35,
    unit: '500 g',
    description: 'Tender ridge gourd rich in dietary fiber and essential minerals.',
    stock: 65,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Snake Gourd',
    nameTamil: '(Pudalangai)',
    category: 'vegetables',
    price: 30,
    unit: '500 g',
    description: 'Long fresh snake gourd, light and easy to digest for daily cooking.',
    stock: 55,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1609142621730-db3293839541?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Yellow Pumpkin',
    nameTamil: '(Poosanikai)',
    category: 'vegetables',
    price: 25,
    unit: '500 g',
    description: 'Sweet yellow pumpkin slices, vibrant and packed with beta-carotene.',
    stock: 70,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1506917728037-05af0b500312?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Raw Banana',
    nameTamil: '(Vazhakkai)',
    category: 'vegetables',
    price: 20,
    unit: '2 pcs',
    description: 'Firm raw plantains perfect for bajji, chips, and traditional curry.',
    stock: 100,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Green Chilli',
    nameTamil: '(Pachai Milagai)',
    category: 'vegetables',
    price: 20,
    unit: '200 g',
    description: 'Spicy green chillies to add heat and aroma to your daily dishes.',
    stock: 150,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Ginger',
    nameTamil: '(Inji)',
    category: 'vegetables',
    price: 40,
    unit: '250 g',
    description: 'Aromatic fresh ginger root with strong digestion-boosting properties.',
    stock: 110,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Cabbage',
    nameTamil: '(Muttakose)',
    category: 'vegetables',
    price: 30,
    unit: '1 pc',
    description: 'Crisp green cabbage head, finely layered and great for stir fries.',
    stock: 80,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Cauliflower',
    nameTamil: '(Cauliflower)',
    category: 'vegetables',
    price: 45,
    unit: '1 pc',
    description: 'Farm fresh white cauliflower florets protected by green leaves.',
    stock: 65,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'French Beans',
    nameTamil: '(Beans)',
    category: 'vegetables',
    price: 45,
    unit: '500 g',
    description: 'Crunchy tender French beans loaded with plant protein and fiber.',
    stock: 90,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'White Radish',
    nameTamil: '(Mullangi)',
    category: 'vegetables',
    price: 30,
    unit: '500 g',
    description: 'Peppery white radish roots, traditional favorite for flavorful sambar.',
    stock: 75,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Cluster Beans',
    nameTamil: '(Kothavarangai)',
    category: 'vegetables',
    price: 35,
    unit: '500 g',
    description: 'Nutritious cluster beans with a unique traditional South Indian taste.',
    stock: 60,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1591189863430-ab87e120f312?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Broad Beans',
    nameTamil: '(Avarakkai)',
    category: 'vegetables',
    price: 40,
    unit: '500 g',
    description: 'Fresh broad beans, tender pods rich in vitamins and dietary fiber.',
    stock: 70,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Ivy Gourd',
    nameTamil: '(Kovakkai)',
    category: 'vegetables',
    price: 35,
    unit: '500 g',
    description: 'Crisp green kovakkai, excellent when roasted crisp with spices.',
    stock: 80,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1628773822503-6e3e5bc875b3?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Ash Gourd',
    nameTamil: '(Vellai Poosani)',
    category: 'vegetables',
    price: 30,
    unit: '500 g',
    description: 'Cooling white ash gourd, traditionally used for kootu and health juices.',
    stock: 50,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Chow Chow',
    nameTamil: '(Seemai Kathirikkai)',
    category: 'vegetables',
    price: 30,
    unit: '500 g',
    description: 'Mild and juicy chayote squash, blends perfectly with dal and coconut.',
    stock: 65,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Coriander Leaves',
    nameTamil: '(Kothamalli)',
    category: 'vegetables',
    price: 15,
    unit: '1 bunch',
    description: 'Aromatic fresh green coriander leaves for garnishing rasam and curries.',
    stock: 150,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1599201994914-dc4d3a8ab751?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Mint Leaves',
    nameTamil: '(Pudina)',
    category: 'vegetables',
    price: 15,
    unit: '1 bunch',
    description: 'Refreshing fragrant mint leaves essential for biryanis and chutneys.',
    stock: 120,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Curry Leaves',
    nameTamil: '(Karuveppilai)',
    category: 'vegetables',
    price: 10,
    unit: '1 bunch',
    description: 'Essential aromatic South Indian tempering herb rich in iron.',
    stock: 200,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1628352081506-83c43123c3c9?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Spinach',
    nameTamil: '(Palak Keerai)',
    category: 'vegetables',
    price: 20,
    unit: '1 bunch',
    description: 'Tender green spinach leaves packed with vitamins and iron.',
    stock: 100,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80'
  },

  // ─── 2. FRUITS (18 products) ──────────────────────────────────────────────────
  {
    name: 'Indian Apple',
    nameTamil: '(Shimla Apple)',
    category: 'fruits',
    price: 140,
    unit: '1 kg',
    description: 'Sweet and crisp Indian Shimla apples picked at peak ripeness.',
    stock: 100,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6fac6?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Washington Apple',
    nameTamil: '(Washington Apple)',
    category: 'fruits',
    price: 220,
    unit: '1 kg',
    description: 'Imported premium red apples with exceptional crunch and juiciness.',
    stock: 80,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Alphonso Mango',
    nameTamil: '(Alphonso Maampazham)',
    category: 'fruits',
    price: 350,
    unit: '1 kg',
    description: 'The King of Mangoes! Rich, golden pulp with unmatched tropical aroma.',
    stock: 60,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    offerTag: 'SEASONAL',
    image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Banganapalli Mango',
    nameTamil: '(Banganapalli Maampazham)',
    category: 'fruits',
    price: 180,
    unit: '1 kg',
    description: 'Large yellow fleshy mangoes with sweet fiberless golden pulp.',
    stock: 90,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Imam Pasand Mango',
    nameTamil: '(Imam Pasand Maampazham)',
    category: 'fruits',
    price: 280,
    unit: '1 kg',
    description: 'Royal variety mango with delicate thin skin and heavenly sweet taste.',
    stock: 50,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Rasalu Mango',
    nameTamil: '(Rasalu Maampazham)',
    category: 'fruits',
    price: 160,
    unit: '1 kg',
    description: 'Juicy traditional mangoes ideal for extracting sweet mango pulp.',
    stock: 70,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Robusta Banana',
    nameTamil: '(Pachai Vazhaipazham)',
    category: 'fruits',
    price: 50,
    unit: '1 kg (~6 pcs)',
    description: 'Fresh green-skinned robusta bananas, sweet and energy-packing.',
    stock: 120,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Poovan Banana',
    nameTamil: '(Poovan Pazham)',
    category: 'fruits',
    price: 60,
    unit: '1 kg (~12 pcs)',
    description: 'Small traditional sweet yellow bananas with slight tangy undertones.',
    stock: 110,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1543218024-57a70143c369?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Nendran Banana',
    nameTamil: '(Nendran Pazham)',
    category: 'fruits',
    price: 80,
    unit: '1 kg',
    description: 'Kerala special large firm plantains, excellent steamed or fried.',
    stock: 80,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Red Banana',
    nameTamil: '(Sevvalai Pazham)',
    category: 'fruits',
    price: 90,
    unit: '1 kg',
    description: 'Exotic reddish-purple bananas loaded with potassium and carotene.',
    stock: 60,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Orange',
    nameTamil: '(Aaranju)',
    category: 'fruits',
    price: 100,
    unit: '1 kg',
    description: 'Juicy Nagpur oranges bursting with vitamin C and refreshing citrus.',
    stock: 130,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Sweet Lime',
    nameTamil: '(Sathukudi)',
    category: 'fruits',
    price: 80,
    unit: '1 kg',
    description: 'Hydrating fresh sweet limes, soothing and ideal for healthy juicing.',
    stock: 100,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Pomegranate',
    nameTamil: '(Mathalam Pazham)',
    category: 'fruits',
    price: 180,
    unit: '1 kg',
    description: 'Ruby red pomegranate arils rich in antioxidants and heart benefits.',
    stock: 90,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Papaya',
    nameTamil: '(Pappali Pazham)',
    category: 'fruits',
    price: 50,
    unit: '1 pc (~1.2 kg)',
    description: 'Sweet ripe orange papaya aids digestion and supports immunity.',
    stock: 70,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Watermelon',
    nameTamil: '(Tharboosani)',
    category: 'fruits',
    price: 60,
    unit: '1 pc (~2.5 kg)',
    description: 'Cool refreshing sweet watermelon with deep red thirst-quenching flesh.',
    stock: 50,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Pineapple',
    nameTamil: '(Anachi Pazham)',
    category: 'fruits',
    price: 70,
    unit: '1 pc',
    description: 'Tangy and tropical sweet pineapple picked fresh from Kerala farms.',
    stock: 65,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Guava',
    nameTamil: '(Koyya Pazham)',
    category: 'fruits',
    price: 60,
    unit: '500 g',
    description: 'Crunchy farm guavas with sweet pink flesh and vitamin C boost.',
    stock: 80,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Green Grapes',
    nameTamil: '(Pachai Thiratchai)',
    category: 'fruits',
    price: 90,
    unit: '500 g',
    description: 'Seedless sweet green grapes, crisp and perfect for instant snacking.',
    stock: 85,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80'
  },

  // ─── 3. BISCUITS (Max 20 products -> 11 items) ────────────────────────────────
  {
    name: 'Good Day Butter Cookies',
    nameTamil: '(Good Day Butter)',
    category: 'biscuits',
    price: 30,
    unit: '120 g',
    description: 'Rich buttery cookies baked to golden perfection by Britannia.',
    stock: 150,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Good Day Cashew Cookies',
    nameTamil: '(Good Day Cashew)',
    category: 'biscuits',
    price: 40,
    unit: '120 g',
    description: 'Crunchy cookies loaded with real roasted cashew nuts.',
    stock: 140,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Marie Gold Biscuit',
    nameTamil: '(Marie Gold)',
    category: 'biscuits',
    price: 20,
    unit: '150 g',
    description: 'Light and crisp tea-time biscuits enriched with wheat vitamins.',
    stock: 200,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1618923850107-d1a234d7a73a?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Tiger Glucose Biscuit',
    nameTamil: '(Tiger Biscuit)',
    category: 'biscuits',
    price: 10,
    unit: '100 g',
    description: 'Energy-filled glucose biscuits loved by children across India.',
    stock: 250,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Bourbon Chocolate Cream',
    nameTamil: '(Bourbon)',
    category: 'biscuits',
    price: 35,
    unit: '120 g',
    description: 'Thick chocolate cream sandwiched between crunchy sugar-sprinkled biscuits.',
    stock: 130,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Milk Bikis',
    nameTamil: '(Milk Bikis)',
    category: 'biscuits',
    price: 25,
    unit: '120 g',
    description: 'Crunchy milk-filled biscuits packed with calcium and essential goodness.',
    stock: 160,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Oreo Original Chocolate Cookies',
    nameTamil: '(Oreo Biscuit)',
    category: 'biscuits',
    price: 40,
    unit: '120 g',
    description: 'Twist, lick, and dunk classic Oreo cookies with vanilla creme.',
    stock: 150,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Parle Hide & Seek Choco Rolls',
    nameTamil: '(Hide & Seek)',
    category: 'biscuits',
    price: 35,
    unit: '100 g',
    description: 'Crunchy choco chip cookies packed with rich melted chocolate bits.',
    stock: 140,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1619149651177-b09092806f1a?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Britannia 50-50 Sweet & Salty',
    nameTamil: '(50-50 Biscuit)',
    category: 'biscuits',
    price: 20,
    unit: '100 g',
    description: 'The iconic combination of sweet sugar crystals and savory salt.',
    stock: 180,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281298?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Monaco Salted Crackers',
    nameTamil: '(Monaco Biscuit)',
    category: 'biscuits',
    price: 15,
    unit: '75 g',
    description: 'Light, crispy salted crackers perfect for toppings and evening snacks.',
    stock: 170,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Krackjack Sweet & Salty Crackers',
    nameTamil: '(Krackjack)',
    category: 'biscuits',
    price: 20,
    unit: '100 g',
    description: 'India’s first sweet and salty biscuit that balances flavors perfectly.',
    stock: 160,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'
  },

  // ─── 4. AACHI MASALA (Max 10 products -> 10 items) ────────────────────────────
  {
    name: 'Aachi Chicken Masala',
    nameTamil: '(Aachi Chicken Masala)',
    category: 'masala',
    price: 35,
    unit: '100 g',
    description: 'Authentic South Indian spice blend for flavorful restaurant-style chicken curry.',
    stock: 120,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Mutton Masala',
    nameTamil: '(Aachi Mutton Masala)',
    category: 'masala',
    price: 45,
    unit: '100 g',
    description: 'Traditional blend of roasted spices tailored for rich mutton gravy.',
    stock: 100,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Sambar Powder',
    nameTamil: '(Aachi Sambar Thool)',
    category: 'masala',
    price: 35,
    unit: '100 g',
    description: 'Classic aromatic spice powder for preparing authentic Tamil Nadu vegetable sambar.',
    stock: 150,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Rasam Powder',
    nameTamil: '(Aachi Rasam Thool)',
    category: 'masala',
    price: 30,
    unit: '100 g',
    description: 'Pepper and cumin infused spice mix for soothing and spicy traditional rasam.',
    stock: 140,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1583160247711-2191776b4b91?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Chilli Powder',
    nameTamil: '(Aachi Milagai Thool)',
    category: 'masala',
    price: 40,
    unit: '100 g',
    description: 'Finely ground sun-dried red chillies for vibrant color and fiery heat.',
    stock: 160,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1627308595229-7830a5c18b1c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Turmeric Powder',
    nameTamil: '(Aachi Manjal Thool)',
    category: 'masala',
    price: 25,
    unit: '100 g',
    description: 'Pure high-curcumin Erode turmeric powder with natural antiseptic benefits.',
    stock: 180,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Coriander Powder',
    nameTamil: '(Aachi Kothamalli Thool)',
    category: 'masala',
    price: 30,
    unit: '100 g',
    description: 'Freshly milled coriander seeds that form the thickening base of Indian curries.',
    stock: 150,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Garam Masala',
    nameTamil: '(Aachi Garam Masala)',
    category: 'masala',
    price: 40,
    unit: '50 g',
    description: 'Premium aromatic warm spices ground finely to enhance North and South gravies.',
    stock: 110,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Biryani Masala',
    nameTamil: '(Aachi Biryani Masala)',
    category: 'masala',
    price: 50,
    unit: '50 g',
    description: 'Secret spice formulation crafted for fragrant Dum Biryani and pulao.',
    stock: 120,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Pepper Powder',
    nameTamil: '(Aachi Milagu Thool)',
    category: 'masala',
    price: 60,
    unit: '50 g',
    description: 'Strong pungent black pepper powder milled from whole Malabar peppercorns.',
    stock: 130,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80'
  },

  // ─── 5. PICKLES (Max 10 products -> 8 items) ──────────────────────────────────
  {
    name: 'Aachi Cut Mango Pickle',
    nameTamil: '(Maangai Oorukai)',
    category: 'pickles',
    price: 50,
    unit: '300 g',
    description: 'Traditional raw mango chunks pickled in gingelly oil and roasted spices.',
    stock: 90,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1589133914023-e18d6a8a4819?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Lemon Pickle',
    nameTamil: '(Elumichai Oorukai)',
    category: 'pickles',
    price: 45,
    unit: '300 g',
    description: 'Tangy and spicy matured lemon pieces cured with salt and red chillies.',
    stock: 85,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Garlic Pickle',
    nameTamil: '(Poondu Oorukai)',
    category: 'pickles',
    price: 60,
    unit: '300 g',
    description: 'Pungent whole garlic cloves steeped in traditional red masala gravy.',
    stock: 80,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Mixed Vegetable Pickle',
    nameTamil: '(Mixed Oorukai)',
    category: 'pickles',
    price: 55,
    unit: '300 g',
    description: 'Delightful medley of carrots, mangoes, lemons, and green chillies.',
    stock: 75,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Tomato Pickle',
    nameTamil: '(Thakkali Oorukai)',
    category: 'pickles',
    price: 50,
    unit: '300 g',
    description: 'Rich tangy ripe tomato thokku seasoned with mustard and fenugreek.',
    stock: 70,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Ginger Pickle',
    nameTamil: '(Inji Oorukai)',
    category: 'pickles',
    price: 55,
    unit: '300 g',
    description: 'Zesty ginger pickle balancing sweetness, spice, and digestive warmth.',
    stock: 65,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Gooseberry Pickle',
    nameTamil: '(Nellikai Oorukai)',
    category: 'pickles',
    price: 50,
    unit: '300 g',
    description: 'Nutrient-rich Indian gooseberries preserved in fiery red pepper marinade.',
    stock: 60,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aachi Green Chilli Pickle',
    nameTamil: '(Pachai Milagai Oorukai)',
    category: 'pickles',
    price: 45,
    unit: '300 g',
    description: 'Spicy green chillies slit and cured in mustard and lemon juice.',
    stock: 70,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80'
  },

  // ─── 6. DETERGENTS (Max 10 products -> 9 items) ───────────────────────────────
  {
    name: 'Surf Excel Easy Wash Powder',
    nameTamil: '(Surf Excel Powder)',
    category: 'detergents',
    price: 130,
    unit: '1 kg',
    description: 'Advanced superfine detergent powder that removes tough stains easily.',
    stock: 100,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Rin Refresh Detergent Powder',
    nameTamil: '(Rin Powder)',
    category: 'detergents',
    price: 85,
    unit: '1 kg',
    description: 'Brightening detergent powder that leaves white clothes dazzling like new.',
    stock: 120,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Ariel Matic Front Load Detergent',
    nameTamil: '(Ariel Matic)',
    category: 'detergents',
    price: 250,
    unit: '1 kg',
    description: 'Specialized low-suds formula designed specifically for front load washing machines.',
    stock: 70,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1585837575651-1a63c6317d0d?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Tide Plus Double Power Jasmine',
    nameTamil: '(Tide Plus)',
    category: 'detergents',
    price: 110,
    unit: '1 kg',
    description: 'Double power stain removal infused with lingering fragrant jasmine aroma.',
    stock: 110,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Wheel Active 2 in 1 Lemon & Jasmine',
    nameTamil: '(Wheel Powder)',
    category: 'detergents',
    price: 65,
    unit: '1 kg',
    description: 'Budget-friendly detergent infused with fresh lemon and sweet jasmine.',
    stock: 150,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Henko Stain Champion Powder',
    nameTamil: '(Henko Powder)',
    category: 'detergents',
    price: 120,
    unit: '1 kg',
    description: 'Stain champion formula with oxygen enzymes that care for fabric color.',
    stock: 80,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Surf Excel Matic Liquid Detergent',
    nameTamil: '(Surf Excel Liquid)',
    category: 'detergents',
    price: 210,
    unit: '1 L',
    description: 'Quick dissolving liquid wash that leaves no residue inside washing machines.',
    stock: 90,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1585837575651-1a63c6317d0d?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Vim Lemon Dishwash Gel',
    nameTamil: '(Vim Gel)',
    category: 'detergents',
    price: 105,
    unit: '500 ml',
    description: 'Power of 100 lemons that degreases heavy burnt utensils effortlessly.',
    stock: 140,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Exo Touch & Shine Round Bar',
    nameTamil: '(Exo Soap)',
    category: 'detergents',
    price: 30,
    unit: '250 g',
    description: 'Anti-bacterial dishwash round bar with cyclozan for sparkling clean vessels.',
    stock: 180,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80'
  },

  // ─── 7. DAIRY PRODUCTS (11 products) ──────────────────────────────────────────
  {
    name: 'Aavin Green Standardized Milk',
    nameTamil: '(Aavin Green Paal)',
    category: 'dairy',
    price: 22,
    unit: '500 ml',
    description: 'Tamil Nadu’s trusted daily fresh pasteurized standardized green milk packet.',
    stock: 200,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    offerTag: 'DAILY',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aavin Blue Toned Milk',
    nameTamil: '(Aavin Blue Paal)',
    category: 'dairy',
    price: 20,
    unit: '500 ml',
    description: 'Low fat healthy toned blue milk packet ideal for daily tea and coffee.',
    stock: 200,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Arokya Full Cream Milk',
    nameTamil: '(Arokya Paal)',
    category: 'dairy',
    price: 36,
    unit: '500 ml',
    description: 'Rich and creamy full fat milk perfect for thick curd and homemade sweets.',
    stock: 180,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Fresh Farm Curd',
    nameTamil: '(Getti Thayir)',
    category: 'dairy',
    price: 35,
    unit: '400 g',
    description: 'Thick creamy natural farm curd with probiotic gut health benefits.',
    stock: 150,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1488477181272-a9e31a65f25c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Amul Fresh Paneer Cubes',
    nameTamil: '(Paneer)',
    category: 'dairy',
    price: 90,
    unit: '200 g',
    description: 'Soft and hygienic Malai paneer blocks packed with vegetarian protein.',
    stock: 100,
    inStock: true,
    isActive: true,
    offerTag: 'FRESH',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Amul Pasteurized Butter',
    nameTamil: '(Vennai)',
    category: 'dairy',
    price: 58,
    unit: '100 g',
    description: 'Utterly butterly delicious creamy salted table butter.',
    stock: 120,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1589985270958-bf087b3c42e0?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Amul Cheese Slices',
    nameTamil: '(Cheese)',
    category: 'dairy',
    price: 135,
    unit: '200 g (10 slices)',
    description: 'Rich processed cheddar cheese slices ready for sandwiches and burgers.',
    stock: 90,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Aavin Pure Cow Ghee',
    nameTamil: '(Pasu Neyi)',
    category: 'dairy',
    price: 310,
    unit: '500 ml',
    description: 'Traditional granular golden cow ghee with rich nostalgic aroma.',
    stock: 80,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Spiced Buttermilk',
    nameTamil: '(Masala Mor)',
    category: 'dairy',
    price: 15,
    unit: '200 ml pouch',
    description: 'Refreshing cooling buttermilk seasoned with ginger, green chillies, and curry leaves.',
    stock: 150,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1628352081506-83c43123c3c9?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Cavins Rose Flavoured Milk',
    nameTamil: '(Rose Milk)',
    category: 'dairy',
    price: 35,
    unit: '180 ml tetrapack',
    description: 'Chilled sweet rose milk milkshake that kids and adults adore.',
    stock: 110,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Milky Mist Greek Yogurt',
    nameTamil: '(Yogurt)',
    category: 'dairy',
    price: 50,
    unit: '100 g',
    description: 'High protein thick creamy blueberry flavored fruit yogurt.',
    stock: 70,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1488477181272-a9e31a65f25c?auto=format&fit=crop&w=600&q=80'
  },

  // ─── 8. SNACKS (8 products) ───────────────────────────────────────────────────
  {
    name: 'Lays Classic Salted Potato Chips',
    nameTamil: '(Lays Yellow)',
    category: 'snacks',
    price: 20,
    unit: '50 g',
    description: 'Crispy thin golden potato chips seasoned with simple pure salt.',
    stock: 180,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Lays India’s Magic Masala',
    nameTamil: '(Lays Blue)',
    category: 'snacks',
    price: 20,
    unit: '50 g',
    description: 'Ridged potato chips coated in spicy aromatic Indian desi masala.',
    stock: 200,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Lays American Style Cream & Onion',
    nameTamil: '(Lays Green)',
    category: 'snacks',
    price: 20,
    unit: '50 g',
    description: 'Smooth sour cream blended with flavorful green herbs and onion.',
    stock: 190,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Lays Spanish Tomato Tango',
    nameTamil: '(Lays Red)',
    category: 'snacks',
    price: 20,
    unit: '50 g',
    description: 'Tangy sweet Spanish tomato flavor bursting on crunchy potato chips.',
    stock: 170,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Kurkure Masala Munch',
    nameTamil: '(Kurkure)',
    category: 'snacks',
    price: 20,
    unit: '75 g',
    description: 'Crunchy corn puffs seasoned with tangy chatpata Indian spices.',
    stock: 210,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Bingo Mad Angles Achaari Masti',
    nameTamil: '(Bingo Triangle)',
    category: 'snacks',
    price: 20,
    unit: '66 g',
    description: 'Unique triangle corn chips packed with tangy mango pickle flavor.',
    stock: 150,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Traditional South Indian Murukku',
    nameTamil: '(Kai Murukku)',
    category: 'snacks',
    price: 60,
    unit: '250 g',
    description: 'Handcrafted crunchy rice flour chakli fried in pure oil.',
    stock: 100,
    inStock: true,
    isActive: true,
    offerTag: 'LOCAL',
    image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Madras Spicy Mixture',
    nameTamil: '(Madras Mixture)',
    category: 'snacks',
    price: 55,
    unit: '200 g',
    description: 'Savory combination of sev, boondi, roasted peanuts, and curry leaves.',
    stock: 110,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80'
  },

  // ─── 9. COOKING OILS (9 products) ─────────────────────────────────────────────
  {
    name: 'Gold Winner Refined Sunflower Oil',
    nameTamil: '(Sunflower Ennai)',
    category: 'oils',
    price: 145,
    unit: '1 L pouch',
    description: 'Fortified light sunflower oil with vitamins A and D for healthy heart.',
    stock: 150,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Fortune Sunlite Sunflower Oil',
    nameTamil: '(Fortune Ennai)',
    category: 'oils',
    price: 150,
    unit: '1 L pouch',
    description: 'Light cooking oil easy to digest and ensures low oil absorption.',
    stock: 130,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Traditional Cold Pressed Groundnut Oil',
    nameTamil: '(Mara Sekku Kadalai Ennai)',
    category: 'oils',
    price: 220,
    unit: '1 L bottle',
    description: 'Wood cold-pressed peanut oil retaining natural nutty flavor and nutrients.',
    stock: 80,
    inStock: true,
    isActive: true,
    isTrending: true,
    offerTag: 'PURE',
    image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Idhayam Gingelly Oil (Sesame)',
    nameTamil: '(Idhayam Nallennai)',
    category: 'oils',
    price: 280,
    unit: '1 L pouch',
    description: 'Premium sesame oil extracted from choice seeds and palm jaggery.',
    stock: 90,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'VVD Gold Pure Coconut Oil',
    nameTamil: '(VVD Thengai Ennai)',
    category: 'oils',
    price: 210,
    unit: '500 ml bottle',
    description: 'Edible grade pure coconut oil made from sun-dried Kerala copra.',
    stock: 100,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Freedom Rice Bran Oil',
    nameTamil: '(Rice Bran Ennai)',
    category: 'oils',
    price: 140,
    unit: '1 L pouch',
    description: 'Rich in oryzanol that actively aids in lowering cholesterol levels.',
    stock: 85,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Fortune Kachi Ghani Mustard Oil',
    nameTamil: '(Kadugu Ennai)',
    category: 'oils',
    price: 160,
    unit: '1 L bottle',
    description: 'Traditional pungent mustard oil extracted preserving natural volatile oils.',
    stock: 70,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Ruchi Gold Palm Oil',
    nameTamil: '(Palmolein Ennai)',
    category: 'oils',
    price: 110,
    unit: '1 L pouch',
    description: 'Economical multi-purpose refined vegetable oil suitable for deep frying.',
    stock: 120,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Anjali Cold Pressed Gingelly Oil',
    nameTamil: '(Anjali Nallennai)',
    category: 'oils',
    price: 270,
    unit: '1 L pouch',
    description: 'Rich fragrant gingelly oil perfect for oil baths and cooking.',
    stock: 75,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=600&q=80'
  },

  // ─── 10. OTHER PRODUCTS (10 products) ─────────────────────────────────────────
  {
    name: 'Garlic (Country Variety)',
    nameTamil: '(Malai Poondu)',
    category: 'others',
    price: 160,
    unit: '500 g',
    description: 'High pungency small country garlic bulbs loaded with allicin.',
    stock: 100,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Fresh Mature Coconut',
    nameTamil: '(Pollachi Thengai)',
    category: 'others',
    price: 35,
    unit: '1 large piece',
    description: 'Sweet water-filled mature Pollachi coconuts with thick grated kernel.',
    stock: 150,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Bru Instant Coffee Powder',
    nameTamil: '(Bru Coffee)',
    category: 'others',
    price: 100,
    unit: '50 g jar',
    description: 'Aromatically roasted coffee beans blended with chicory for strong South filter taste.',
    stock: 130,
    inStock: true,
    isActive: true,
    isTrending: true,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Nescafe Sunrise Rich Coffee',
    nameTamil: '(Sunrise Coffee)',
    category: 'others',
    price: 95,
    unit: '50 g pack',
    description: 'Instant coffee granules capturing the slow roasted aroma of coffee beans.',
    stock: 110,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: '3 Roses Dust Tea Powder',
    nameTamil: '(3 Roses Tea)',
    category: 'others',
    price: 140,
    unit: '250 g pack',
    description: 'Premium Assam tea dust giving irresistible color, strength, and flavor.',
    stock: 140,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Chakra Gold Premium Tea Powder',
    nameTamil: '(Chakra Gold Tea)',
    category: 'others',
    price: 150,
    unit: '250 g pack',
    description: 'Long leaves mixed with strong dust for authentic golden Tamil Nadu tea.',
    stock: 100,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Organic Chemical-Free Jaggery',
    nameTamil: '(Mandavellam / Naattu Sarkkarai)',
    category: 'others',
    price: 70,
    unit: '1 kg block',
    description: 'Pure dark sugarcane jaggery free from sulphur bleaching chemicals.',
    stock: 90,
    inStock: true,
    isActive: true,
    offerTag: 'ORGANIC',
    image: 'https://images.unsplash.com/photo-1622484212850-2f80164c0175?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Refined White Sugar',
    nameTamil: '(Sarkkarai)',
    category: 'others',
    price: 44,
    unit: '1 kg pack',
    description: 'Hygienically packed clean sparkling white sulphur-free sugar crystals.',
    stock: 200,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1581375074612-d1fd0e661aeb?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Tata Crystal Sea Salt',
    nameTamil: '(Kallu Uppu)',
    category: 'others',
    price: 20,
    unit: '1 kg pack',
    description: 'Pure natural sun-evaporated sea crystal salt fortified with iodine.',
    stock: 180,
    inStock: true,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1518110929396-2fe0de3c46be?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Tata Vacuum Evaporated Iodized Salt',
    nameTamil: '(Thool Uppu)',
    category: 'others',
    price: 28,
    unit: '1 kg pack',
    description: 'India’s most trusted free-flowing iodized salt ensuring mental development.',
    stock: 220,
    inStock: true,
    isActive: true,
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1518110929396-2fe0de3c46be?auto=format&fit=crop&w=600&q=80'
  }
];

async function seed() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma for seeding products...');

    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of PRODUCTS) {
      item.nameTamil = cleanAndConvertTamilName(item.nameTamil, item.name);
      item.tamilName = item.nameTamil;

      // Check duplicate by Product Name, Tamil Name, or Category combination
      const existing = await prisma.product.findFirst({
        where: {
          OR: [
            { name: { equals: item.name, mode: 'insensitive' } },
            { nameTamil: item.nameTamil }
          ]
        }
      });

      if (existing) {
        console.log(`[SKIP] Duplicate already exists: "${item.name}" (${item.nameTamil}) in [${item.category}]`);
        skippedCount++;
      } else {
        // Find or create Category ID
        let categoryId = null;
        if (item.category) {
          const categoryName = item.category === 'others' ? 'Others' : 
                               item.category === 'coffee & tea' ? 'Coffee & Tea' :
                               item.category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          
          let categoryObj = await prisma.category.findFirst({
            where: { name: { equals: categoryName, mode: 'insensitive' } }
          });
          
          if (!categoryObj) {
            categoryObj = await prisma.category.create({
              data: {
                name: categoryName,
                isActive: true
              }
            });
          }
          categoryId = categoryObj.id;
        }

        const { category, ...rest } = item;
        await prisma.product.create({
          data: {
            ...rest,
            nameTamil: item.nameTamil,
            tamilName: item.nameTamil,
            categorySlug: category,
            categoryId: categoryId
          }
        });

        console.log(`[INSERT] Added new product: "${item.name}" (${item.nameTamil})`);
        insertedCount++;
      }
    }

    console.log('\n──────────────────────────────────────────────');
    console.log(`Seeding Summary:`);
    console.log(`✅ Inserted : ${insertedCount} products`);
    console.log(`⏭️ Skipped  : ${skippedCount} existing products`);
    console.log(`📦 Total Processed : ${PRODUCTS.length} items`);
    console.log('──────────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
