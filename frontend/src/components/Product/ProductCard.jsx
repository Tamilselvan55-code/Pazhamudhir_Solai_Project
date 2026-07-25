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
    <div className="bg-white rounded-[16px] shadow-sm p-2.5 flex flex-col h-full relative transition-all duration-300 hover:shadow-md hover:-translate-y-1 group">
      
      {/* Wishlist Button - absolute to the card */}
      <button
        onClick={handleToggleWishlist}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        className={`absolute top-2 right-2 w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 transition-all duration-250 z-10 ${
          isAnimatingHeart ? 'scale-125' : 'hover:bg-gray-50 active:scale-90'
        }`}
      >
        <Heart
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-250 ${
            isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'
          } ${isAnimatingHeart ? 'scale-110' : 'scale-100'}`}
        />
      </button>

      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
        {product.offerTag && (
          <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm tracking-wide w-max">
            {product.offerTag}
          </span>
        )}
        {product.isBestSeller && !product.offerTag && (
          <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm w-max">
            ⭐ BEST
          </span>
        )}
        {product.isTrending && !product.offerTag && !product.isBestSeller && (
          <span className="bg-purple-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm w-max">
            🔥 TREND
          </span>
        )}
      </div>

      {/* Out of stock overlay */}
      {!isInStock && (
        <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-20 rounded-[16px]">
          <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
            Out of Stock
          </span>
        </div>
      )}

      {/* Image Container */}
      <div className="w-full flex items-center justify-center mt-3 mb-2">
        <div className="w-[95px] h-[95px] flex items-center justify-center">
          <ProductImage
            src={product.image}
            alt={product.name}
            category={product.category}
            fit="contain"
            size="lg"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
          />
        </div>
      </div>

      {/* Info Container */}
      <div className="flex flex-col flex-1">
        <h3 className="text-[13px] sm:text-sm font-bold text-gray-800 leading-tight line-clamp-2 mb-0.5">{product.name}</h3>
        
        {(product.tamilName || product.nameTamil) && (
          <span className="text-[11px] sm:text-[12px] text-green-700 font-semibold truncate mb-0.5">
            {product.tamilName || product.nameTamil}
          </span>
        )}
        
        <span className="text-[10px] sm:text-[11px] text-gray-500 block mb-2">{product.unit}</span>

        <div className="mt-auto flex items-center justify-between gap-1">
          <span className="text-[14px] sm:text-base font-extrabold text-gray-900 truncate">
            {formatCurrency(product.price)}
          </span>

          {quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              disabled={!isInStock}
              className="bg-green-600 text-white text-[11px] sm:text-xs font-bold h-[28px] sm:h-[32px] px-2.5 sm:px-3 rounded-full shadow-sm hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-1 shrink-0 disabled:bg-gray-300"
            >
              <Plus className="w-3.5 h-3.5" /> ADD
            </button>
          ) : (
            <div className="flex items-center bg-green-600 text-white rounded-full shadow-sm h-[28px] sm:h-[32px] shrink-0">
              <button
                onClick={async () => {
                  if (quantity <= 1) {
                    const ok = await userConfirm('Remove Item?', 'Do you want to remove this item from your cart?', { danger: true, confirmLabel: 'Remove' });
                    if (ok) updateQuantity(product._id, 0);
                  } else {
                    updateQuantity(product._id, quantity - 1);
                  }
                }}
                className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center rounded-full hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[11px] sm:text-xs font-bold min-w-[1rem] text-center">{quantity}</span>
              <button
                onClick={() => updateQuantity(product._id, quantity + 1)}
                className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center rounded-full hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

