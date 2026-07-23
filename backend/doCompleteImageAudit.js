import prisma from './utils/prismaClient.js';

const IMAGE_MAP = {
  // VEGETABLES
  'Drumstick': 'https://images.unsplash.com/photo-1567367584887-8df2d7b2c9d4?auto=format&fit=crop&w=600&q=85',
  'Bottle Gourd': 'https://images.unsplash.com/photo-1630145397184-c8c226498529?auto=format&fit=crop&w=600&q=85',
  'Bitter Gourd': 'https://images.unsplash.com/photo-1589983022889-5a40e3e8e68f?auto=format&fit=crop&w=600&q=85',
  'Snake Gourd': 'https://images.unsplash.com/photo-1609142621730-db3293839541?auto=format&fit=crop&w=600&q=85',
  'Pumpkin': 'https://images.unsplash.com/photo-1572989088340-05d3c5f84d0d?auto=format&fit=crop&w=600&q=85',
  'Broad Beans': 'https://images.unsplash.com/photo-1616805765352-beba2d7bf2d3?auto=format&fit=crop&w=600&q=85',
  'Plantain Flower': 'https://images.unsplash.com/photo-1600346019001-8d56d1b51d59?auto=format&fit=crop&w=600&q=85', // using generic
  'Cauliflower': 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=85',
  'Garlic': 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?auto=format&fit=crop&w=600&q=85',
  'Onion': 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=85',
  'Ridge Gourd': 'https://images.unsplash.com/photo-1625380560757-5aef35f5a5de?auto=format&fit=crop&w=600&q=85',
  'Beans': 'https://images.unsplash.com/photo-1568584393003-33e8fdab0f65?auto=format&fit=crop&w=600&q=85',
  'Capsicum': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=85',
  'Carrot': 'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=600&q=85',
  'Coriander Leaves': 'https://images.unsplash.com/photo-1666762363816-f32e53ddb636?auto=format&fit=crop&w=600&q=85',
  'Ginger': 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?auto=format&fit=crop&w=600&q=85',
  'Green Chilli': 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=600&q=85',
  'Lemon': 'https://images.unsplash.com/photo-1590502593747-4229879f7ef7?auto=format&fit=crop&w=600&q=85',
  'Mint Leaves': 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?auto=format&fit=crop&w=600&q=85',
  'Radish': 'https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=600&q=85',
  'Sweet Potato': 'https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?auto=format&fit=crop&w=600&q=85',
  'Tomato': 'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?auto=format&fit=crop&w=600&q=85',
  'Brinjal': 'https://images.unsplash.com/photo-1659010952895-7d5e0af2febd?auto=format&fit=crop&w=600&q=85',
  'Curry Leaves': 'https://images.unsplash.com/photo-1576181256399-834e3b3a49bf?auto=format&fit=crop&w=600&q=85',
  'Plantain Stem': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=85',
  'Beetroot': 'https://images.unsplash.com/photo-1643130793917-51de7f39e8d6?auto=format&fit=crop&w=600&q=85',
  'Cabbage': 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=600&q=85',
  'Cucumber': 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=600&q=85',
  'Ladies Finger': 'https://images.unsplash.com/photo-1621239939862-dfea2e0bcf37?auto=format&fit=crop&w=600&q=85',
  'Potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=85',

  // FRUITS
  'Banana Yelakki': 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=600&q=85',
  'Mango Alphonso': 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=85',
  'Pomegranate': 'https://images.unsplash.com/photo-1541344999736-83eca272f6fc?auto=format&fit=crop&w=600&q=85',
  'Sweet Lime': 'https://images.unsplash.com/photo-1587132134227-b2d00dfae580?auto=format&fit=crop&w=600&q=85',
  'Green Grapes': 'https://images.unsplash.com/photo-1515779122185-2390ccdf060b?auto=format&fit=crop&w=600&q=85',
  'Sapota': 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=85', // generic substitute
  'Jackfruit': 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=600&q=85',
  'Muskmelon': 'https://images.unsplash.com/photo-1571575173700-afb9492e6a50?auto=format&fit=crop&w=600&q=85',
  'Custard Apple': 'https://images.unsplash.com/photo-1583091910609-b690c5f0a28a?auto=format&fit=crop&w=600&q=85',
  'Plums': 'https://images.unsplash.com/photo-1563283281-9b6e82845347?auto=format&fit=crop&w=600&q=85',
  'Guava': 'https://images.unsplash.com/photo-1616744830718-dbe48e9e7e9a?auto=format&fit=crop&w=600&q=85',
  'Banana Robusta': 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=600&q=85',
  'Dragon Fruit': 'https://images.unsplash.com/photo-1527324410118-2c2e6423cc98?auto=format&fit=crop&w=600&q=85',
  'Grapes Seedless': 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=85',
  'Orange Imported': 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?auto=format&fit=crop&w=600&q=85',
  'Pineapple': 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=85',
  'Watermelon': 'https://images.unsplash.com/photo-1563114773-84221bd62daa?auto=format&fit=crop&w=600&q=85',
  'Papaya': 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=600&q=85',
  'Apple Royal Gala': 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=600&q=85',
  'Kiwi Imported': 'https://images.unsplash.com/photo-1585065544467-0c7f1a30a113?auto=format&fit=crop&w=600&q=85',

  // OILS
  'Gold Winner Sunflower Oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=85',
  'Idhayam Sesame Oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=85',
  'Parachute Coconut Oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=85',
  'VSL Groundnut Oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=85',
  'Fortune Mustard Oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=85',
  'Olive Oil Pomace': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=85',
  'Heritage Cow Ghee': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=85',
  'Rice Bran Oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=85',
  'Gingelly Oil Premium': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=85',
  'Castor Oil Pure': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=85',

  // PICKLES
  'Mango Pickle': 'https://images.unsplash.com/photo-1589133914023-e18d6a8a4819?auto=format&fit=crop&w=600&q=85',
  'Lemon Pickle': 'https://images.unsplash.com/photo-1597714026720-8f74c62310ba?auto=format&fit=crop&w=600&q=85',
  'Garlic Pickle': 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=85',
  'Mixed Vegetable Pickle': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=85',
  'Citron Pickle (Narthangai)': 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=85',
  'Ginger Pickle (Inji)': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=85',
  'Tomato Pickle': 'https://images.unsplash.com/photo-1546094096-0df4bcabd2e6?auto=format&fit=crop&w=600&q=85',
  'Amla Pickle': 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=85',
  'Green Chilli Pickle': 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=85',
  'Bitter Gourd Pickle': 'https://images.unsplash.com/photo-1627308595229-7830a5c18b1c?auto=format&fit=crop&w=600&q=85',

  // BISCUITS
  'Parle-G Gluco Biscuits': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=85',
  'Britannia Good Day Cashew': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=85',
  'Britannia Marie Gold': 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=600&q=85',
  'Oreo Chocolate Cream': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=600&q=85',
  'Britannia Bourbon': 'https://images.unsplash.com/photo-1548907994-25499ee79a78?auto=format&fit=crop&w=600&q=85',
  'Sunfeast Dark Fantasy': 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&w=600&q=85',
  'Sunfeast Mom’s Magic': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=85',
  'Parle Hide & Seek': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=85',
  'Britannia Milk Bikis': 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&w=600&q=85',
  'Britannia 50-50 Maska Chaska': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=85',

  // SNACKS
  'Potato Chips Salted': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=85',
  'Traditional Murukku': 'https://images.unsplash.com/photo-1630343710506-89f8b9f21d31?auto=format&fit=crop&w=600&q=85',
  'Madras Mixture': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Kara Boondi': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Banana Chips Pepper': 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=85',
  'Ribbon Pakoda': 'https://images.unsplash.com/photo-1630343710506-89f8b9f21d31?auto=format&fit=crop&w=600&q=85',
  'Masala Peanuts': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=85',
  'Thattai Snacks': 'https://images.unsplash.com/photo-1630343710506-89f8b9f21d31?auto=format&fit=crop&w=600&q=85',
  'Omapodi': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Haldiram’s Bhujia Sev': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',

  // DAIRY PRODUCTS
  'Aavin Green Milk Premium': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=85',
  'Amul Salted Butter': 'https://images.unsplash.com/photo-1589985270958-bf087b3c42e0?auto=format&fit=crop&w=600&q=85',
  'Amul Paneer Fresh': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Aavin Curd Packet': 'https://images.unsplash.com/photo-1488477181272-a9e31a65f25c?auto=format&fit=crop&w=600&q=85',
  'Amul Cheese Slices': 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=600&q=85',
  'Milky Mist Fresh Paneer': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Amul Taaza Milk Tetrapack': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=85',
  'Aavin Ghee Jar': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=85',
  'Milky Mist Set Curd Cup': 'https://images.unsplash.com/photo-1488477181272-a9e31a65f25c?auto=format&fit=crop&w=600&q=85',
  'Amul Fresh Whipping Cream': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=85',

  // DETERGENTS
  'Surf Excel Easy Wash': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=85',
  'Rin Detergent Powder': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=85',
  'Ariel Complete Powder': 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=600&q=85',
  'Vim Dishwash Liquid Gel': 'https://images.unsplash.com/photo-1585837575651-1a63c6317d0d?auto=format&fit=crop&w=600&q=85',
  'Comfort Fabric Conditioner': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=85',
  'Pril Liquid Dishwash': 'https://images.unsplash.com/photo-1585837575651-1a63c6317d0d?auto=format&fit=crop&w=600&q=85',
  'Dettol Antiseptic Liquid': 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?auto=format&fit=crop&w=600&q=85',
  'Lizol Floor Cleaner Citrus': 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?auto=format&fit=crop&w=600&q=85',
  'Harpic Toilet Cleaner': 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?auto=format&fit=crop&w=600&q=85',
  'Rin Detergent Soap Bar': 'https://images.unsplash.com/photo-1585737431915-53c780e5e9e4?auto=format&fit=crop&w=600&q=85',

  // COFFEE AND TEA
  'Narasus Udhayam Coffee': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=85',
  '3 Roses Dust Tea': 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=600&q=85',
  'Taj Mahal Premium Tea': 'https://images.unsplash.com/photo-1515696955266-4f67e13219e8?auto=format&fit=crop&w=600&q=85',
  'Cothas Coffee Traditional': 'https://images.unsplash.com/photo-1497935586047-9395ee065fd0?auto=format&fit=crop&w=600&q=85',
  'Nescafe Classic Instant': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=85',
  'Tata Tea Chakra Gold': 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=600&q=85',
  'Red Label Tea Natural Care': 'https://images.unsplash.com/photo-1515696955266-4f67e13219e8?auto=format&fit=crop&w=600&q=85',
  'AVT Premium Dust Tea': 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=600&q=85',
  'Green Tea Honey Lemon': 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?auto=format&fit=crop&w=600&q=85',
  'Bru Instant Coffee Powder': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=85',

  // MASALAS
  'Aachi Sambar Powder': 'https://images.unsplash.com/photo-1613727867023-e41cdf8d2ac6?auto=format&fit=crop&w=600&q=85',
  'Aachi Garam Masala': 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=600&q=85',
  'Turmeric Powder Pure': 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=600&q=85',
  'Chilli Powder Extra Hot': 'https://images.unsplash.com/photo-1508615070457-7baeba4003ab?auto=format&fit=crop&w=600&q=85',
  'Sakthi Coriander Powder': 'https://images.unsplash.com/photo-1609540586408-b7c02e1d0a69?auto=format&fit=crop&w=600&q=85',
  'Sakthi Biryani Masala': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=85',
  'Aachi Kulambu Milagai Thool': 'https://images.unsplash.com/photo-1508615070457-7baeba4003ab?auto=format&fit=crop&w=600&q=85',
  'Sakthi Pepper Powder': 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=600&q=85',
  'Aachi Chicken Masala': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=85',
  'Aachi Mutton Masala': 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=600&q=85',

  // RICE
  'Ponni Boiled Rice Premium': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',
  'Basmati Rice India Gate': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',
  'Raw Rice (Pachai Arisi)': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',
  'Idli Rice Gundu Arisi': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',
  'Brown Rice Organic': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',
  'Jeeraga Samba Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',
  'Sona Masoori Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',
  'Seeraga Samba Briyani Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',
  'Karuppu Kavuni Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',
  'Mapillai Samba Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=600&q=85',

  // FLOUR
  'Aashirvaad Shudh Chakki Atta': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',
  'Maida Premium Quality': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',
  'Rice Flour (Arisi Maavu)': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',
  'Ragi Flour (Finger Millet)': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',
  'Gram Flour (Besan)': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',
  'Bajra Flour (Pearl Millet)': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',
  'Semolina (Sooji Rava)': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',
  'Wheat Rava Medium': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',
  'Corn Flour Thickener': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',
  'Multi Grain Atta': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=85',

  // SOAP
  'Dettol Liquid Handwash Refill': 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?auto=format&fit=crop&w=600&q=85',
  'Santoor Sandal Bath Soap': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=85',
  'Dettol Original Soap Bar': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=85',
  'Lifebuoy Total Soap Bar': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=85',
  'Hammam Neem Soap Bar': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=85',
  'Lux Soft Touch Rose Soap': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=85',
  'Medimix Ayurvedic Soap': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=85',
  'Margo Pure Neem Soap': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=85',
  'Godrej No.1 Sandal Soap': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=85',
  'Dove Cream Bathing Bar': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=85',

  // BEVERAGES
  'Maaza Mango Drink Juice': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=85',
  'Tropicana Orange Juice Juice': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=85',
  'Coca Cola Soft Drink': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=85',
  'Sprite Soft Drink Lime': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=85',
  'Pepsi Soft Drink': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=85',
  'Kinley Mineral Water bottle': 'https://images.unsplash.com/photo-1548839140-29a749e1ab14?auto=format&fit=crop&w=600&q=85',
  'Paper Boat Mango Aamras': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=85',
  'Real Mixed Fruit Juice': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=85',
  '7Up Soft Drink Lemon': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=85',
  'Red Bull Energy Drink': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=85'
};

async function fixImages() {
  await prisma.$connect();
  console.log('\\n✅ Connected to PostgreSQL via Prisma');
  console.log('🔍 Scanning all products for image audit...\\n');
  
  const allProducts = await prisma.product.findMany({});
  console.log(`📦 Total products found: ${allProducts.length}\\n`);

  let updated = 0;
  let skipped = 0;
  let notMapped = 0;

  for (const product of allProducts) {
    const correctUrl = IMAGE_MAP[product.name];

    if (!correctUrl) {
      console.log(`⚠️  [NO MAP]  "${product.name}"`);
      notMapped++;
      continue;
    }

    // Replace if wrong, empty, or duplicate. We enforce the exact mapping.
    if (product.image === correctUrl) {
      // It is already correct
      skipped++;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { image: correctUrl, images: [correctUrl] }
    });
    
    console.log(`🖼️  [FIXED]   "${product.name}"`);
    updated++;
  }

  console.log('\\n' + '='.repeat(64));
  console.log('📊 Summary:');
  console.log(`   ✅ Fixed   : ${updated} products`);
  console.log(`   ⏭️  Skipped : ${skipped} (already correct)`);
  console.log(`   ⚠️  No map  : ${notMapped} (not in list)`);
  console.log(`   📦 Total   : ${allProducts.length}`);
  console.log('='.repeat(64));
  console.log('\\n🎉 Complete Image Audit & Replacement is Done!\\n');

  await prisma.$disconnect();
}

fixImages().catch(e => {
  console.error(e);
  process.exit(1);
});
