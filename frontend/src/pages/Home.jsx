import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../config/api';
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductCard from '../components/Product/ProductCard';
import { ChevronRight, Search, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import useSettingsStore from '../store/useSettingsStore';

const emojiMap = {
  'vegetables': '🥦',
  'greens': '🌿',
  'fruits': '🍎',
  'biscuits': '🍪',
  'masala': '🌶️',
  'pickles': '🥭',
  'detergents': '🧼',
  'dairy': '🥛',
  'snacks': '🍿',
  'oils': '🛢️',
  'others': '🧂',
  'chocolate': '🍫',
  'masalas': '🌶️'
};

const colorMap = [
  'bg-green-100 text-green-800',
  'bg-orange-100 text-orange-800',
  'bg-amber-100 text-amber-800',
  'bg-red-100 text-red-800',
  'bg-rose-100 text-rose-800',
  'bg-cyan-100 text-cyan-800',
  'bg-blue-100 text-blue-800',
  'bg-yellow-100 text-yellow-800',
  'bg-slate-100 text-slate-800'
];

const BASE_SECTION_META = {
  vegetables: { title:'Fresh Vegetables',   tamTitle:'Pazha Kaaikarigal',    emoji:'🥦', banner:'bg-gradient-to-r from-green-600 to-green-400' },
  greens:     { title:'Fresh Greens',       tamTitle:'Keerai Vagaigal',      emoji:'🌿', banner:'bg-gradient-to-r from-emerald-600 to-teal-400' },
  fruits:     { title:'Fresh Fruits',       tamTitle:'Pazhanggal',           emoji:'🍎', banner:'bg-gradient-to-r from-orange-500 to-amber-400' },
  biscuits:   { title:'Biscuits & Cookies', tamTitle:'Biscuit Vagaigal',     emoji:'🍪', banner:'bg-gradient-to-r from-amber-600 to-yellow-500' },
  masala:     { title:'Aachi Masala',       tamTitle:'Aachi Masala Vagaigal',emoji:'🌶️', banner:'bg-gradient-to-r from-red-600 to-orange-500' },
  pickles:    { title:'Tasty Pickles',      tamTitle:'Oorukai Vagaigal',     emoji:'🥭', banner:'bg-gradient-to-r from-rose-600 to-pink-500' },
  detergents: { title:'Detergents & Cleaners',tamTitle:'Suthaputhappu Porutkal',emoji:'🧼', banner:'bg-gradient-to-r from-cyan-600 to-blue-500' },
  dairy:      { title:'Dairy Products',     tamTitle:'Paal Vagaigal',        emoji:'🥛', banner:'bg-gradient-to-r from-blue-500 to-cyan-400' },
  snacks:     { title:'Snacks & Savories',  tamTitle:'Thinpandangal',        emoji:'🍿', banner:'bg-gradient-to-r from-yellow-500 to-amber-500' },
  oils:       { title:'Pure Cooking Oils',  tamTitle:'Samayal Ennaigal',     emoji:'🛢️', banner:'bg-gradient-to-r from-amber-700 to-yellow-600' },
  others:     { title:'Other Grocery Items',tamTitle:'Matra Maligai Porutkal',emoji:'🧂', banner:'bg-gradient-to-r from-slate-700 to-gray-500' },
};

const getCategorySlug = (name) => {
  const categoryName = typeof name === 'string' ? name : name?.name || name?.slug || '';
  const n = categoryName.toLowerCase().trim();
  if (n === 'vegetables' || n.includes('veg')) return 'vegetables';
  if (n === 'fruits' || n.includes('fruit')) return 'fruits';
  if (n.includes('dairy') || n.includes('milk')) return 'dairy';
  if (n.includes('biscuit') || n.includes('cookie')) return 'biscuits';
  if (n.includes('snack') || n.includes('savor')) return 'snacks';
  if (n.includes('masala') || n.includes('spice')) return 'masala';
  if (n.includes('oil')) return 'oils';
  if (n.includes('detergent') || n.includes('cleaner') || n.includes('soap')) return 'detergents';
  if (n.includes('pickle')) return 'pickles';
  if (n.includes('other')) return 'others';
  return n.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
};

const matchesCategory = (product, catObj) => {
  if (catObj.id === 'all') return true;
  const categoryName = typeof product.category === 'string'
    ? product.category
    : product.category?.name || product.category?.slug || product.categorySlug || '';
  const pCat = categoryName.toLowerCase().trim();
  const catObjName = typeof catObj.name === 'string'
    ? catObj.name
    : catObj.name?.name || catObj.slug || catObj.id || '';
  const catObjSlug = catObjName.toLowerCase().trim();
  if (pCat === catObj.id) return true;
  if (pCat === catObjSlug) return true;
  if (catObj.id === 'dairy' && pCat.includes('dairy')) return true;
  if (catObj.id === 'masala' && pCat.includes('masala')) return true;
  if (catObj.id === 'oils' && pCat.includes('oil')) return true;
  if (catObj.id === 'detergents' && (pCat.includes('detergent') || pCat.includes('cleaner'))) return true;
  if (catObj.id === 'biscuits' && (pCat.includes('biscuit') || pCat.includes('cookie'))) return true;
  if (catObj.id === 'snacks' && pCat.includes('snack')) return true;
  if (catObj.id === 'pickles' && pCat.includes('pickle')) return true;
  return false;
};

// ── Section Component ──────────────────────────────────────────────────────────
const ProductSection = ({ categoryObj, products, onSeeAll }) => {
  const meta = BASE_SECTION_META[categoryObj.id] || {
    title: categoryObj.name,
    tamTitle: categoryObj.tamilName || categoryObj.name,
    emoji: categoryObj.emoji || '📦',
    banner: 'bg-gradient-to-r from-green-600 to-green-400'
  };
  if (!products.length) return null;
  return (
    <section className="mb-8" id={categoryObj.id}>
      <div className={`${meta.banner} rounded-2xl px-4 py-3 mb-3 flex items-center justify-between shadow-sm`}>
        <div>
          <h2 className="text-white font-extrabold text-base flex items-center gap-2">
            {meta.emoji} {meta.title}
          </h2>
          <p className="text-white/80 text-xs">{meta.tamTitle}</p>
        </div>
        <button onClick={() => onSeeAll(categoryObj.id)} className="text-white/90 text-xs font-semibold flex items-center bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors">
          See all <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3">
        {products.map(p => <ProductCard key={p._id} product={p} />)}
      </div>
    </section>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const Home = () => {
  const settings = useSettingsStore((s) => s.settings);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [categoriesList, setCategoriesList] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const { data } = await axios.get(`${config_API_BASE}/categories`);
      
      const mapped = data.map((cat, idx) => {
        const id = getCategorySlug(cat.name);
        const meta = BASE_SECTION_META[id];
        const emoji = cat.emoji || (meta ? meta.emoji : (emojiMap[id] || '📦'));
        const color = colorMap[idx % colorMap.length];
        return {
          id,
          name: cat.name,
          tamilName: cat.tamilName || (meta ? meta.tamTitle : ''),
          emoji,
          color
        };
      });

      setCategoriesList([{ id: 'all', name: 'All', emoji: '🛒', color: 'bg-green-600 text-white border-green-600' }, ...mapped]);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await axios.get(`${config_API_BASE}/products`);
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleCategoryUpdate = () => {
      fetchCategories();
    };
    const handleProductUpdate = (e) => {
      const updatedProd = e.detail;
      if (!updatedProd || !updatedProd._id) return;
      const timestamp = Date.now();
      const rawImg = updatedProd.image || '';
      const versionedImg = rawImg ? `${rawImg}${rawImg.includes('?') ? '&' : '?'}v=${timestamp}` : rawImg;

      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p._id === updatedProd._id
            ? { ...p, ...updatedProd, image: versionedImg || p.image }
            : p
        )
      );
    };

    window.addEventListener('socket_category_update', handleCategoryUpdate);
    window.addEventListener('socket_product_update', handleProductUpdate);
    return () => {
      window.removeEventListener('socket_category_update', handleCategoryUpdate);
      window.removeEventListener('socket_product_update', handleProductUpdate);
    };
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== 'all') {
      const activeCatObj = categoriesList.find(c => c.id === activeCategory) || { id: activeCategory };
      list = list.filter(p => matchesCategory(p, activeCatObj));
    }
    if (searchQuery.trim()) {
      const queryStr = typeof searchQuery === 'string' ? searchQuery : String(searchQuery || '');
      const q = queryStr.toLowerCase().trim();
      const tanglishMap = {
        'vengayam': ['onion', 'வெங்காயம்'],
        'kathirikai': ['brinjal', 'கத்திரிக்காய்'],
        'kathirikkai': ['brinjal', 'கத்திரிக்காய்'],
        'murungakkai': ['drumstick', 'முருங்கைக்காய்'],
        'vendakkai': ['ladies finger', 'okra', 'வெண்டைக்காய்'],
        'sarkkarai': ['sugar', 'சர்க்கரை'],
        'thool uppu': ['salt', 'தூள் உப்பு'],
        'kallu uppu': ['rock salt', 'கல் உப்பு'],
        'naatu sarkkarai': ['jaggery', 'country sugar', 'நாட்டு சர்க்கரை'],
        'poondu': ['garlic', 'பூண்டு'],
        'thakkali': ['tomato', 'தக்காளி'],
        'urulaikizhangu': ['potato', 'உருளைக்கிழங்கு']
      };
      const synonyms = tanglishMap[q] || [];
      list = list.filter(p => {
        const engVal = typeof p.name === 'string' ? p.name : p.name?.name || String(p.name || '');
        const tamVal = typeof (p.nameTamil || p.tamilName) === 'string' ? (p.nameTamil || p.tamilName) : String(p.nameTamil || p.tamilName || '');
        const engAltVal = typeof p.englishName === 'string' ? p.englishName : String(p.englishName || '');
        const eng = engVal.toLowerCase();
        const tam = tamVal.toLowerCase();
        const engAlt = engAltVal.toLowerCase();
        if (eng.includes(q) || tam.includes(q) || engAlt.includes(q)) return true;
        return synonyms.some(syn => eng.includes(syn) || tam.includes(syn));
      });
    }
    return list;
  }, [products, activeCategory, searchQuery]);

  const trending    = useMemo(() => products.filter(p => p.isTrending).slice(0, 6), [products]);
  const bestSellers = useMemo(() => products.filter(p => p.isBestSeller).slice(0, 6), [products]);
  const showSections = activeCategory === 'all' && !searchQuery.trim();

  const sectionMeta = useMemo(() => {
    const meta = {};
    categoriesList.forEach(cat => {
      if (cat.id === 'all') return;
      meta[cat.id] = {
        title: cat.name,
        tamTitle: cat.tamilName || cat.name,
        emoji: cat.emoji || '📦',
        banner: 'bg-gradient-to-r from-green-600 to-green-400'
      };
    });
    return meta;
  }, [categoriesList]);

  useEffect(() => {
    if (!loading && !categoriesLoading && products.length > 0 && showSections) {
      const params = new URLSearchParams(location.search);
      const targetId = params.get('scroll');

      if (targetId) {
        const element = document.getElementById(targetId);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
            navigate("/", { replace: true });
          }, 100);
        }
      }
    }
  }, [loading, categoriesLoading, products.length, showSections, location.search, navigate]);

  return (
    <div className="pb-24 max-w-7xl mx-auto px-2 sm:px-3 md:px-4">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden my-3 sm:my-4 shadow-lg h-36 sm:h-40 md:h-56">
        <img 
          src={
            settings?.homepageBanner && settings.homepageBanner.trim() !== ''
              ? (settings.homepageBanner.startsWith('http') || settings.homepageBanner.startsWith('data:')
                  ? settings.homepageBanner
                  : `${config_API_URL}${settings.homepageBanner.startsWith('/') ? '' : '/'}${settings.homepageBanner}`)
              : "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80"
          }
          alt="Fresh Groceries" 
          className="w-full h-full object-cover" 
        />
        <div 
          className="absolute inset-0 flex flex-col justify-center px-4 sm:px-5 md:px-10"
          style={{
            background: 'linear-gradient(90deg, rgba(var(--color-primary-rgb, 22, 163, 74), 0.9) 0%, rgba(var(--color-secondary-rgb, 129, 199, 132), 0.5) 70%, transparent 100%)'
          }}
        >
          <span className="text-white text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1 bg-black/25 px-2 py-0.5 rounded-full w-fit max-w-[90%] truncate">
            Hyperlocal · {Number(settings?.deliveryRadiusKm || import.meta.env.VITE_DELIVERY_RADIUS_KM || 30)} KM Delivery ({settings?.deliveryTiming || 'Same Day'})
          </span>
          <h1 className="text-lg sm:text-xl md:text-3xl font-extrabold text-white leading-tight mb-1 mt-1 sm:mt-2">
            {settings?.storeName || 'Fresh Groceries'} 🛒<br />
            <span className="text-green-200 text-[10px] sm:text-xs md:text-lg font-semibold line-clamp-1">
              {settings?.websiteName || 'Tiruchendur Murugan Pazhamudhir Solai'}
            </span>
          </h1>
          <p className="text-white/80 text-[9px] sm:text-[10px] md:text-xs max-w-[85%] line-clamp-2">
            {settings?.storeDescription || 'Fresh fruits, vegetables, groceries and daily essentials.'}
          </p>
        </div>
      </div>

      {/* ── Page Search ──────────────────────────────────────────────── */}
      <div className="relative mb-3 sm:mb-4">
        <Search className="absolute left-3 sm:left-4 top-3.5 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full bg-white border-2 border-gray-200 focus:border-green-500 rounded-2xl py-3 pl-9 sm:pl-10 pr-10 text-sm focus:outline-none shadow-sm transition-colors"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 sm:right-4 top-3.5 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Category Chips ────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
        {categoriesLoading ? (
          <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-green-600" />
            <span>Loading categories...</span>
          </div>
        ) : (
          categoriesList.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm border ${
                activeCategory === cat.id
                  ? 'bg-green-600 text-white border-green-600 scale-105 shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-center">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-500">Loading fresh products...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500 bg-white rounded-2xl border border-red-100">
          <p className="font-semibold text-base mb-1">Failed to load products</p>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold text-base">No products available</p>
        </div>
      ) : (
        <>
          {/* ── Search Results ────────────────────────────────────────────── */}
          {searchQuery.trim() && (
            <div className="mb-8">
              <p className="text-sm text-gray-500 mb-3">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "<strong>{searchQuery}</strong>"
              </p>
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="font-semibold">No items found</p>
                  <p className="text-sm">Try searching in English or Thanglish</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3">
                  {filtered.map(p => <ProductCard key={p._id} product={p} />)}
                </div>
              )}
            </div>
          )}

          {/* ── Filtered Category View ────────────────────────────────────── */}
          {!searchQuery && activeCategory !== 'all' && (
            <div className="mb-8">
              <div className={`${BASE_SECTION_META[activeCategory]?.banner || 'bg-green-600'} rounded-2xl px-4 py-3 mb-4 shadow-sm`}>
                <h2 className="text-white font-extrabold text-base">
                  {BASE_SECTION_META[activeCategory]?.emoji || '📦'} {BASE_SECTION_META[activeCategory]?.title || activeCategory}
                </h2>
                <p className="text-white/80 text-xs">{BASE_SECTION_META[activeCategory]?.tamTitle}</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3">
                {filtered.map(p => <ProductCard key={p._id} product={p} />)}
              </div>
            </div>
          )}

          {/* ── Full Home View ────────────────────────────────────────────── */}
          {showSections && (
            <>
              {/* Offer Strip */}
              <div className="flex gap-3 overflow-x-auto pb-2 mb-6 no-scrollbar">
                {[
                  { icon:'🛵', title:'Free Delivery', sub:'All orders', bg:'bg-green-50 border-green-200' },
                  { icon:'🌅', title:'Daily Fresh',   sub:'Morning harvest', bg:'bg-orange-50 border-orange-200' },
                  { icon:'💰', title:'Best Price',    sub:'No hidden costs', bg:'bg-blue-50 border-blue-200' },
                  { icon:'⚡', title:'30 Min',        sub:'Quick delivery', bg:'bg-purple-50 border-purple-200' },
                ].map(o => (
                  <div key={o.title} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${o.bg} min-w-max shrink-0`}>
                    <span className="text-xl">{o.icon}</span>
                    <div>
                      <p className="font-bold text-xs text-gray-800">{o.title}</p>
                      <p className="text-[10px] text-gray-500">{o.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trending Section */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                      🔥 Trending Now
                    </h2>
                    <p className="text-xs text-gray-500">இன்றைய பிரபல பொருட்கள்</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
                  {trending.map(p => <ProductCard key={`tr-${p._id}`} product={p} />)}
                </div>
              </section>

              {/* Best Sellers */}
              <section className="mb-8">
                <div className="bg-gradient-to-r from-amber-500 to-orange-400 rounded-2xl px-4 py-3 mb-3 flex items-center justify-between shadow-sm">
                  <div>
                    <h2 className="text-white font-extrabold text-base">⭐ Best Sellers</h2>
                    <p className="text-white/80 text-xs">அதிகம் விற்கப்படுகின்றன</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
                  {bestSellers.map(p => <ProductCard key={`bs-${p._id}`} product={p} />)}
                </div>
              </section>

              {/* Category Sections */}
              {categoriesList.filter(c => c.id !== 'all').map(cat => (
                <ProductSection
                  key={cat.id}
                  categoryObj={cat}
                  products={products.filter(p => matchesCategory(p, cat))}
                  onSeeAll={setActiveCategory}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
