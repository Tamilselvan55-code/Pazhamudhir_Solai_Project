import React from 'react';
import { Plus, Minus, Heart } from 'lucide-react';
import useCartStore from '../../store/useCartStore';
import useWishlistStore from '../../store/useWishlistStore';
import useModal from '../../hooks/useModal';
import useGuestGuard from '../../hooks/useGuestGuard';
import { formatCurrency } from '../../utils/currency';
import ProductImage from './ProductImage';

const ProductCard = ({ product }) => {
  const { cartItems, addToCart, updateQuantity } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { userConfirm, toast } = useModal();
  const { requireAuth } = useGuestGuard();
  
  const [isAnimatingHeart, setIsAnimatingHeart] = React.useState(false);

  const cartItem = cartItems.find(item => item.product === product._id);
  const quantity = cartItem ? cartItem.quantity : 0;
  const isInStock = product.inStock !== false;
  const isWishlisted = isInWishlist(product._id);

  // Guard: only add to cart if user is logged in
  const handleAddToCart = () => {
    if (!requireAuth('Please log in to add products to your cart.')) return;
    addToCart(product);
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
    }  return (
    <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 flex flex-col w-full h-[210px] sm:h-full relative transition-all duration-200 hover:shadow-md group overflow-hidden sm:overflow-visible">
      {/* Image Container */}
      <div className="h-[95px] flex-none flex items-center justify-center p-[8px] sm:relative sm:w-full sm:h-[140px] md:h-[160px] lg:h-[180px] sm:flex-auto sm:bg-white sm:p-[12px]">
        <ProductImage
          src={product.image}
          alt={product.name}
          category={product.category}
          fit="contain"
          className="w-[90px] h-[90px] sm:w-full sm:h-full object-contain object-center group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
        />

        {/* Wishlist Heart Button */}
        <button
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-[8px] right-[8px] sm:top-2 sm:right-2 p-1 sm:p-1.5 w-[30px] h-[30px] sm:w-[32px] sm:h-[32px] flex items-center justify-center rounded-full bg-white sm:bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm transition-all duration-250 z-10 ${
            isAnimatingHeart ? 'scale-125' : 'hover:bg-gray-50 active:scale-90'
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-250 ${
              isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'
            } ${isAnimatingHeart ? 'scale-110' : 'scale-100'}`}
          />
        </button>

        {/* Offer badge */}
        {product.offerTag && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md tracking-wide">
            {product.offerTag}
          </span>
        )}

        {/* Best seller */}
        {product.isBestSeller && !product.offerTag && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md">
            ⭐ BEST
          </span>
        )}

        {/* Trending */}
        {product.isTrending && !product.offerTag && !product.isBestSeller && (
          <span className="absolute top-2 left-2 bg-purple-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md">
            🔥 TREND
          </span>
        )}

        {/* Out of stock overlay */}
        {!isInStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-20">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 bg-white px-2 py-1 sm:px-3 sm:py-1 rounded-full border border-gray-200">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="flex-none sm:flex-1 flex flex-col p-[8px] sm:px-2 sm:pb-2 sm:p-2.5 bg-white">
        {/* Name (English) */}
        <h3 className="text-[13px] sm:text-xs font-bold text-gray-800 leading-tight line-clamp-2">{product.name}</h3>
        
        {/* Tamil name */}
        {(product.tamilName || product.nameTamil) && (
          <span className="text-[11px] text-[#00a651] sm:text-green-700 font-bold truncate mt-0.5">
            {product.tamilName || product.nameTamil}
          </span>
        )}
        <span className="text-[10px] text-gray-400 mt-0.5 mb-2">{product.unit}</span>

        {/* Bottom Row */}
        <div className="flex items-center justify-between gap-1 sm:mt-auto">
          <span className="text-[16px] sm:text-sm font-bold text-black sm:text-gray-900 truncate">
            {formatCurrency(product.price)}
          </span>

          {quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              disabled={!isInStock}
              className="bg-[#00a651] sm:bg-green-600 text-white text-[11px] sm:text-[10px] font-bold h-[34px] w-[72px] sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl shadow-sm hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-1 shrink-0 disabled:bg-gray-300"
            >
              <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" strokeWidth={3} /> ADD
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#00a651] sm:bg-green-600 text-white rounded-full sm:rounded-xl shadow-sm h-[34px] w-[72px] sm:w-auto sm:h-auto overflow-hidden shrink-0">
              <button
                onClick={async () => {
                  if (quantity <= 1) {
                    const ok = await userConfirm('Remove Item?', 'Do you want to remove this item from your cart?', { danger: true, confirmLabel: 'Remove' });
                    if (ok) updateQuantity(product._id, 0);
                  } else {
                    updateQuantity(product._id, quantity - 1);
                  }
                }}
                className="w-[26px] h-full sm:w-auto sm:h-auto sm:p-1.5 flex items-center justify-center hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Minus className="w-3 h-3 sm:w-3 sm:h-3" strokeWidth={3} />
              </button>
              <span className="text-[11px] sm:text-xs font-bold text-center flex-1">{quantity}</span>
              <button
                onClick={() => updateQuantity(product._id, quantity + 1)}
                className="w-[26px] h-full sm:w-auto sm:h-auto sm:p-1.5 flex items-center justify-center hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Plus className="w-3 h-3 sm:w-3 sm:h-3" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

