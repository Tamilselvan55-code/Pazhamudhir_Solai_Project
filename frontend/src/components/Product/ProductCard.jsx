import React, { useCallback } from 'react';
import { Plus, Minus, Heart } from 'lucide-react';
import useCartStore from '../../store/useCartStore';
import useWishlistStore from '../../store/useWishlistStore';
import useModal from '../../hooks/useModal';
import useGuestGuard from '../../hooks/useGuestGuard';
import { formatCurrency } from '../../utils/currency';
import ProductImage from './ProductImage';
import ProductPopup from './ProductPopup';

const ProductCard = React.memo(({ product }) => {
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const cartItem = useCartStore(
    useCallback(state => state.cartItems.find(item => item.product === product._id), [product._id])
  );
  
  const toggleWishlist = useWishlistStore(state => state.toggleWishlist);
  const isWishlisted = useWishlistStore(
    useCallback(state => state.wishlistItems.some(item => item._id === product._id || item.id === product._id), [product._id])
  );

  const { userConfirm, toast } = useModal();
  const { requireAuth } = useGuestGuard();
  
  const [isAnimatingHeart, setIsAnimatingHeart] = React.useState(false);
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);

  const quantity = cartItem ? cartItem.quantity : 0;
  const isInStock = product.inStock !== false;

  // Guard: open popup instead of adding directly
  const handleAddClick = (e) => {
    e.stopPropagation();
    setIsPopupOpen(true);
  };

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();
    if (!requireAuth('Please log in to add products to your wishlist.')) return;
    
    // Start animation
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

  return (
    <>
    <div 
      onClick={() => setIsPopupOpen(true)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group cursor-pointer"
    >
      {/* Image */}
      <div className="relative w-full h-[110px] sm:h-[140px] md:h-[160px] lg:h-[180px] flex items-center justify-center bg-white overflow-hidden p-[8px] sm:p-[12px]" style={{ borderRadius: '12px 12px 0 0' }}>
        <ProductImage
          src={product.image}
          alt={product.name}
          category={product.category}
          fit="contain"
          size="lg"
          className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
        />

        {/* Wishlist Heart Button */}
        <button
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm transition-all duration-250 z-10 ${
            isAnimatingHeart ? 'scale-125' : 'hover:bg-white active:scale-90'
          }`}
        >
          <Heart
            className={`w-4 h-4 transition-all duration-250 ${
              isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'
            } ${isAnimatingHeart ? 'scale-110' : 'scale-100'}`}
          />
        </button>

        {/* Offer badge */}
        {product.offerTag && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md tracking-wide">
            {product.offerTag}
          </span>
        )}

        {/* Best seller */}
        {product.isBestSeller && !product.offerTag && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
            ⭐ BEST
          </span>
        )}

        {/* Trending */}
        {product.isTrending && !product.offerTag && !product.isBestSeller && (
          <span className="absolute top-2 left-2 bg-purple-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
            🔥 TREND
          </span>
        )}

        {/* Out of stock overlay */}
        {!isInStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col flex-1">
        {/* Name (English) */}
        <h3 className="text-xs font-bold text-gray-800 leading-tight">{product.name}</h3>
        {/* Tamil name */}
        {(product.tamilName || product.nameTamil) && (
          <span className="text-[11px] text-green-700 font-semibold">{product.tamilName || product.nameTamil}</span>
        )}
        <span className="text-[10px] text-gray-400 mt-0.5 mb-2">{product.unit}</span>

        <div className="mt-auto flex items-center justify-between gap-1">
          <div>
            <span className="text-sm font-extrabold text-gray-900">{formatCurrency(product.price)}</span>
          </div>

          {quantity === 0 ? (
            <button
              onClick={handleAddClick}
              disabled={!isInStock}
              className="bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow hover:bg-green-700 active:scale-95 transition-all flex items-center gap-1 disabled:bg-gray-300"
            >
              <Plus className="w-3 h-3" /> ADD
            </button>
          ) : (
            <div className="flex items-center bg-green-600 text-white rounded-xl shadow overflow-hidden">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (quantity <= 1) {
                    const ok = await userConfirm('Remove Item?', 'Do you want to remove this item from your cart?', { danger: true, confirmLabel: 'Remove' });
                    if (ok) updateQuantity(product._id, 0);
                  } else {
                    updateQuantity(product._id, quantity - 1);
                  }
                }}
                className="p-1.5 hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-2 text-xs font-bold min-w-[1.5rem] text-center">{quantity}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(product._id, quantity + 1);
                }}
                className="p-1.5 hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    
    <ProductPopup 
      product={product} 
      isOpen={isPopupOpen} 
      onClose={() => setIsPopupOpen(false)} 
    />
    </>
  );
});

export default ProductCard;

