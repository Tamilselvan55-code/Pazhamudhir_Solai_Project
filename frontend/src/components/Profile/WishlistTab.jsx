import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Heart, ShoppingBag, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useCartStore from '../../store/useCartStore';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';
import ProductImage from '../Product/ProductImage';

const API_BASE = config_API_BASE;

const WishlistTab = () => {
  const { userInfo } = useAuthStore();
  const { addToCart } = useCartStore();
  const { toast, userAlert } = useModal();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {};

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/auth/wishlist`, { headers });
      setWishlist(data || []);
    } catch (err) {
      console.error('Failed to fetch wishlist', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId) => {
    try {
      const { data } = await axios.delete(`${API_BASE}/auth/wishlist/${productId}`, { headers });
      setWishlist(data || []);
    } catch (err) {
      userAlert('Error', 'Failed to remove item from wishlist.');
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    toast('Cart Updated', `${product.name} added to your cart!`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin text-green-600" />
        <span>Loading wishlist items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Wishlist</h2>
          <p className="text-xs text-gray-500 mt-0.5">Your saved favorite fruits & vegetables</p>
        </div>
        <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-extrabold rounded-full border border-green-200">
          {wishlist.length} Items
        </span>
      </div>

      {wishlist.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">Your Wishlist is Empty</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Save products you like to your wishlist by clicking the heart icon while shopping.
          </p>
          <Link
            to="/"
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 mt-2 transition-all shadow-md"
          >
            <ShoppingBag className="w-4 h-4" /> Explore Store
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {wishlist.map((product) => (
            <div
              key={product._id}
              className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="relative">
                <ProductImage
                  src={product.image}
                  alt={product.name}
                  category={product.category}
                  fit="cover"
                  size="lg"
                  className="w-full h-36 rounded-2xl bg-gray-50 mb-3"
                />
                <button
                  onClick={() => handleRemove(product._id)}
                  className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white text-red-500 rounded-full shadow-sm backdrop-blur-sm transition-colors"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-sm text-gray-900 truncate">{product.name}</h4>
                <div className="flex items-center justify-between mt-1 mb-4">
                  <span className="text-base font-extrabold text-green-600">{formatCurrency(product.price)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    product.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>

              <button
                disabled={!product.inStock}
                onClick={() => handleAddToCart(product)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  product.inStock
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-4 h-4" /> Add to Cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistTab;
