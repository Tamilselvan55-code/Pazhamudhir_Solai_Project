import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Heart } from 'lucide-react';
import useCartStore from '../../store/useCartStore';
import useWishlistStore from '../../store/useWishlistStore';
import useModal from '../../hooks/useModal';
import useGuestGuard from '../../hooks/useGuestGuard';
import { formatCurrency } from '../../utils/currency';
import ProductImage from './ProductImage';

const ProductPopup = ({ product, isOpen, onClose }) => {
  const { cartItems, addToCart, updateQuantity } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { toast } = useModal();
  const { requireAuth } = useGuestGuard();
  const [localQty, setLocalQty] = useState(1);
  const [isAnimatingHeart, setIsAnimatingHeart] = useState(false);

  // Sync cart quantity when popup opens
  useEffect(() => {
    if (isOpen) {
      const cartItem = cartItems.find(item => item.product === product._id);
      setLocalQty(cartItem ? cartItem.quantity : 1);
    }
  }, [isOpen, cartItems, product._id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cartItem = cartItems.find(item => item.product === product._id);
  const currentCartQty = cartItem ? cartItem.quantity : 0;
  const isWishlisted = isInWishlist(product._id);
  const isInStock = product.inStock !== false;

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();
    if (!requireAuth('Please log in to add products to your wishlist.')) return;
    
    setIsAnimatingHeart(true);
    setTimeout(() => setIsAnimatingHeart(false), 300);

    const result = await toggleWishlist(product);
    if (result && result.success) {
      if (result.action === 'added') {
        toast('Wishlist Updated', `❤️ ${product.name} added to wishlist!`);
      } else {
        toast('Wishlist Updated', `💔 ${product.name} removed from wishlist.`);
      }
    }
  };

  const handleAddToCart = () => {
    if (!requireAuth('Please log in to add products to your cart.')) return;
    
    if (currentCartQty > 0) {
      updateQuantity(product._id, localQty);
      toast('Cart Updated', `Updated quantity for ${product.name}`);
    } else {
      // Need to add to cart first (adds 1).
      addToCart(product);
      // Then if localQty > 1, immediately update it to the desired quantity.
      if (localQty > 1) {
         updateQuantity(product._id, localQty);
      }
      toast('Success', 'Added to Cart Successfully');
    }
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-[480px] h-[520px] sm:h-[580px] flex flex-col relative animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-sm hover:bg-gray-100 active:scale-95 transition-all text-gray-600 border border-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Image Section */}
        <div className="relative w-full h-[240px] sm:h-[280px] bg-white flex items-center justify-center p-8 shrink-0">
          <ProductImage
            src={product.image}
            alt={product.name}
            category={product.category}
            fit="contain"
            size="lg"
            className="w-full h-full object-contain mix-blend-multiply drop-shadow-md"
          />

          {/* Floating Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm transition-all duration-250 z-10 ${
              isAnimatingHeart ? 'scale-125' : 'hover:bg-gray-50 active:scale-90'
            }`}
          >
            <Heart
              className={`w-5 h-5 transition-all duration-250 ${
                isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'
              } ${isAnimatingHeart ? 'scale-110' : 'scale-100'}`}
            />
          </button>
        </div>

        {/* Product Details Section */}
        <div className="p-6 flex flex-col flex-1 bg-white rounded-t-3xl shadow-[0_-8px_16px_-6px_rgba(0,0,0,0.05)] z-10 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <h2 className="text-xl font-extrabold text-gray-900 leading-tight line-clamp-2" title={product.name}>{product.name}</h2>
            {(product.tamilName || product.nameTamil) && (
              <p className="text-sm text-green-700 font-bold mt-1.5 truncate" title={product.tamilName || product.nameTamil}>{product.tamilName || product.nameTamil}</p>
            )}
            <p className="text-gray-500 font-medium mt-1.5 truncate">{product.unit}</p>
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-3 shrink-0">
            <div className="text-2xl font-black text-gray-900">
              {formatCurrency(product.price)}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Quantity Selector */}
              <div className="flex items-center bg-gray-100 rounded-2xl p-1 shrink-0">
                <button 
                  onClick={() => setLocalQty(Math.max(1, localQty - 1))}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-700 hover:text-green-600 active:scale-95 transition-all"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-12 text-center font-bold text-lg">{localQty}</span>
                <button 
                  onClick={() => setLocalQty(localQty + 1)}
                  aria-label="Increase quantity"
                  className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-700 hover:text-green-600 active:scale-95 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button 
                onClick={handleAddToCart}
                disabled={!isInStock}
                className="flex-1 bg-green-600 hover:bg-green-700 active:scale-95 disabled:bg-gray-400 text-white font-bold text-lg rounded-2xl h-12 flex items-center justify-center shadow-lg shadow-green-600/30 transition-all"
              >
                🛒 {currentCartQty > 0 ? 'Update Cart' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPopup;
