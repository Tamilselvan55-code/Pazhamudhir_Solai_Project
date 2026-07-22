import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE as config_API_BASE } from '../config/api';
import { Search, ChevronRight, PackageX } from 'lucide-react';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          axios.get(`${config_API_BASE}/categories`),
          axios.get(`${config_API_BASE}/products`)
        ]);
        
        // Remove 'all' if backend includes it, or just use as-is
        setCategories(catRes.data.filter(c => c.id !== 'all'));
        setProducts(prodRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo(0, 0);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = {};
    categories.forEach(c => {
      counts[c.id] = 0;
    });
    products.forEach(p => {
      const catId = typeof p.category === 'string' ? p.category : p.category?.id || p.category?.slug || '';
      if (catId) {
        const matched = categories.find(c => c.id === catId || c.id === catId.toLowerCase() || c.name.toLowerCase() === catId.toLowerCase());
        if (matched) counts[matched.id] = (counts[matched.id] || 0) + 1;
      }
    });
    return counts;
  }, [categories, products]);

  const filteredCategories = useMemo(() => {
    let list = categories;
    if (activeChip !== 'All') {
      list = list.filter(c => c.name.toLowerCase().includes(activeChip.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.tamilName && c.tamilName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [categories, searchQuery, activeChip]);

  const chips = ['All', 'Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Beverages', 'Groceries', 'Personal Care', 'Cleaning'];

  const popularCategories = useMemo(() => {
    return categories.slice(0, 5);
  }, [categories]);

  if (loading) {
    return (
      <div className="pb-28 max-w-7xl mx-auto px-4 pt-6 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading Categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 max-w-7xl mx-auto px-4 pt-4 sm:pt-6 animate-in fade-in duration-300">
      
      {/* Sticky Header */}
      <div className="sticky top-14 sm:top-16 bg-[#f7fdf7]/95 backdrop-blur-md z-40 py-4 -mx-4 px-4 shadow-sm border-b border-gray-100 transition-all">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">Categories</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Choose your shopping category</p>
        
        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none shadow-sm transition-all"
          />
        </div>

        {/* Quick Access Chips */}
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {chips.map(chip => (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                activeChip === chip 
                  ? 'bg-green-600 text-white border border-green-600' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Category Grid */}
      <div className="mt-6">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <PackageX className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800">No categories found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {filteredCategories.map(cat => (
              <Link 
                to={`/?category=${cat.id}`} 
                key={cat.id}
                className={`group bg-white rounded-[20px] p-4 flex flex-col items-center text-center shadow-sm border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                  activeChip === cat.name ? 'border-green-500 bg-green-50/30' : 'border-gray-50 hover:shadow-lg hover:border-green-200 hover:-translate-y-1'
                }`}
              >
                <div className="w-16 h-16 md:w-20 md:h-20 mb-3 bg-gray-50 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300 overflow-hidden p-2">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-3xl">{cat.emoji || '📦'}</span>
                  )}
                </div>
                <h3 className="text-sm font-extrabold text-gray-800 leading-tight group-hover:text-green-600 transition-colors line-clamp-1">{cat.name}</h3>
                {cat.tamilName && (
                  <span className="text-[10px] text-green-700 font-semibold mt-0.5 line-clamp-1">{cat.tamilName}</span>
                )}
                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md mt-2">
                  {categoryCounts[cat.id] || 0} Products
                </span>
                
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  <ChevronRight className="w-4 h-4 text-green-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      {!searchQuery && activeChip === 'All' && popularCategories.length > 0 && (
        <div className="mt-10 pt-8 border-t border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">Popular Categories</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {popularCategories.map(cat => (
              <Link
                key={`pop-${cat.id}`}
                to={`/?category=${cat.id}`}
                className="min-w-[120px] bg-white rounded-[20px] p-3 shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-green-300 hover:-translate-y-0.5 transition-all"
              >
                <div className="w-12 h-12 mb-2 bg-gray-50 rounded-full flex items-center justify-center p-1.5">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl">{cat.emoji || '🔥'}</span>
                  )}
                </div>
                <span className="text-xs font-bold text-gray-800 line-clamp-1">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Categories;
