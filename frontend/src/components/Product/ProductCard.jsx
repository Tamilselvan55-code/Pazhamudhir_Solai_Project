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
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 sm:hover:-translate-y-1 group">
      {/* Image */}
      <div className="relative w-full h-[70px] sm:h-[140px] md:h-[160px] lg:h-[180px] flex items-center justify-center bg-white overflow-hidden p-1 sm:p-[12px]" style={{ borderRadius: '12px 12px 0 0' }}>
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
          className={`absolute top-1 right-1 sm:top-2 sm:right-2 p-1 sm:p-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm transition-all duration-250 z-10 ${
            isAnimatingHeart ? 'scale-125' : 'hover:bg-white active:scale-90'
          }`}
        >
          <Heart
            className={`w-3 h-3 sm:w-4 sm:h-4 transition-all duration-250 ${
              isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'
            } ${isAnimatingHeart ? 'scale-110' : 'scale-100'}`}
          />
        </button>

        {/* Offer badge */}
        {product.offerTag && (
          <span className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-red-500 text-white text-[7px] sm:text-[9px] font-extrabold px-1 sm:px-2 py-0.5 rounded-full shadow-md tracking-wide">
            {product.offerTag}
          </span>
        )}

        {/* Best seller */}
        {product.isBestSeller && !product.offerTag && (
          <span className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-amber-500 text-white text-[7px] sm:text-[9px] font-extrabold px-1 sm:px-2 py-0.5 rounded-full shadow-md">
            ⭐ BEST
          </span>
        )}

        {/* Trending */}
        {product.isTrending && !product.offerTag && !product.isBestSeller && (
          <span className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-purple-500 text-white text-[7px] sm:text-[9px] font-extrabold px-1 sm:px-2 py-0.5 rounded-full shadow-md">
            🔥 TREND
          </span>
        )}

        {/* Out of stock overlay */}
        {!isInStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="text-[9px] sm:text-xs font-bold text-gray-500 bg-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-gray-200">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-1 sm:p-2.5 flex flex-col flex-1">
        {/* Name (English) */}
        <h3 className="text-[9px] sm:text-xs font-bold text-gray-800 leading-[1.1] sm:leading-tight line-clamp-2">{product.name}</h3>
        {/* Tamil name */}
        {(product.tamilName || product.nameTamil) && (
          <span className="text-[8px] sm:text-[11px] text-green-700 font-bold truncate mt-[1px]">{product.tamilName || product.nameTamil}</span>
        )}
        <span className="text-[8px] sm:text-[10px] text-gray-400 mt-[1px] sm:mb-2">{product.unit}</span>

        <div className="mt-auto pt-0.5 sm:pt-0 flex items-center justify-between gap-0.5 sm:gap-1 w-full">
          <div className="flex-1 truncate pr-0.5 sm:pr-0">
            <span className="text-[10px] sm:text-sm font-extrabold text-gray-900">{formatCurrency(product.price)}</span>
          </div>

          {quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              disabled={!isInStock}
              className="bg-green-600 text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-3 h-5 sm:h-[30px] rounded-md sm:rounded-xl shadow hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-0.5 sm:gap-1 disabled:bg-gray-300 shrink-0 min-w-[36px] sm:min-w-[60px]"
            >
              <Plus className="w-2 h-2 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">ADD</span><span className="sm:hidden">ADD</span>
            </button>
          ) : (
            <div className="flex items-center justify-between bg-green-600 text-white rounded-md sm:rounded-xl shadow overflow-hidden h-5 sm:h-[30px] shrink-0 min-w-[42px] sm:min-w-[75px]">
              <button
                onClick={async () => {
                  if (quantity <= 1) {
                    const ok = await userConfirm('Remove Item?', 'Do you want to remove this item from your cart?', { danger: true, confirmLabel: 'Remove' });
                    if (ok) updateQuantity(product._id, 0);
                  } else {
                    updateQuantity(product._id, quantity - 1);
                  }
                }}
                className="p-0.5 sm:p-1.5 flex-1 flex justify-center hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Minus className="w-2 h-2 sm:w-3 sm:h-3" />
              </button>
              <span className="px-0.5 sm:px-2 text-[9px] sm:text-xs font-bold text-center min-w-[12px] sm:min-w-[1.5rem]">{quantity}</span>
              <button
                onClick={() => updateQuantity(product._id, quantity + 1)}
                className="p-0.5 sm:p-1.5 flex-1 flex justify-center hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Plus className="w-2 h-2 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

