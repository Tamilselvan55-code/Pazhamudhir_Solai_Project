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
    <div className="bg-white rounded-[16px] shadow-sm p-[10px] flex flex-col transition-all duration-300 hover:shadow-md hover:-translate-y-1 group min-h-[220px]">
      {/* Image Container */}
      <div className="relative w-full h-[100px] flex items-center justify-center bg-white mb-2">
        <ProductImage
          src={product.image}
          alt={product.name}
          category={product.category}
          fit="contain"
          size="lg"
          className="w-[90%] h-[100px] object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
        />

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-0 right-0 w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white shadow transition-all duration-250 z-10 ${
            isAnimatingHeart ? 'scale-125' : 'hover:bg-gray-50 active:scale-90'
          }`}
        >
          <Heart
            className={`w-[16px] h-[16px] transition-all duration-250 ${
              isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'
            } ${isAnimatingHeart ? 'scale-110' : 'scale-100'}`}
          />
        </button>

        {/* Offer badge */}
        {product.offerTag && (
          <span className="absolute top-0 left-0 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md tracking-wide z-10">
            {product.offerTag}
          </span>
        )}

        {/* Best seller */}
        {product.isBestSeller && !product.offerTag && (
          <span className="absolute top-0 left-0 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10">
            ⭐ BEST
          </span>
        )}

        {/* Trending */}
        {product.isTrending && !product.offerTag && !product.isBestSeller && (
          <span className="absolute top-0 left-0 bg-purple-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10">
            🔥 TREND
          </span>
        )}

        {/* Out of stock overlay */}
        {!isInStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-20">
            <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1">
        {/* Name (English) */}
        <h3 className="text-[14px] font-bold text-gray-800 leading-tight line-clamp-2 mb-1">{product.name}</h3>
        {/* Tamil name */}
        {(product.tamilName || product.nameTamil) && (
          <span className="text-[13px] text-green-700 truncate block mb-1">
            {product.tamilName || product.nameTamil}
          </span>
        )}
        <span className="text-[12px] text-gray-500 block mb-2">{product.unit}</span>

        <div className="mt-auto flex items-center justify-between">
          <span className="text-[22px] font-bold text-gray-900">{formatCurrency(product.price)}</span>

          {quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              disabled={!isInStock}
              className="bg-green-600 text-white text-[13px] font-bold h-[34px] w-[75px] rounded-full shadow-sm hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-1 disabled:bg-gray-300"
            >
              <Plus className="w-4 h-4" /> ADD
            </button>
          ) : (
            <div className="flex items-center bg-green-600 text-white rounded-full shadow-sm h-[34px] min-w-[75px] justify-between px-1">
              <button
                onClick={async () => {
                  if (quantity <= 1) {
                    const ok = await userConfirm('Remove Item?', 'Do you want to remove this item from your cart?', { danger: true, confirmLabel: 'Remove' });
                    if (ok) updateQuantity(product._id, 0);
                  } else {
                    updateQuantity(product._id, quantity - 1);
                  }
                }}
                className="p-1.5 rounded-full hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-1 text-[13px] font-bold text-center">{quantity}</span>
              <button
                onClick={() => updateQuantity(product._id, quantity + 1)}
                className="p-1.5 rounded-full hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

