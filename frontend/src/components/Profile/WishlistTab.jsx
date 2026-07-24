import React, { useEffect } from 'react';
import { Heart, ShoppingBag, Trash2, Loader2, Tag, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useCartStore from '../../store/useCartStore';
import useWishlistStore from '../../store/useWishlistStore';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';
import ProductImage from '../Product/ProductImage';

const WishlistTab = () => {
  const { userInfo } = useAuthStore();
  const { addToCart, cartItems } = useCartStore();
  const { wishlistItems, loading, fetchWishlist, removeFromWishlist } = useWishlistStore();
  const { toast, userAlert } = useModal();

  useEffect(() => {
    if (userInfo) {
      fetchWishlist();
    }
  }, [userInfo, fetchWishlist]);

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      toast('Wishlist Updated', '💔 Item removed from your wishlist.');
    } catch (err) {
      userAlert('Error', 'Failed to remove item from wishlist.');
    }
  };

  const handleAddToCart = (product) => {
    if (product.inStock === false) {
      toast('Out of Stock', `${product.name} is currently out of stock.`);
      return;
    }
    addToCart(product);
    toast('Cart Updated', `🛒 ${product.name} added to your cart!`);
  };

  const handleMoveToCart = async (product) => {
    const prodId = product._id || product.id;
    if (product.inStock === false) {
      toast('Out of Stock', `${product.name} is currently out of stock.`);
      return;
    }
    addToCart(product);
    try {
      await removeFromWishlist(prodId);
    } catch (err) {
      console.warn('Remove from wishlist failed after move to cart:', err);
    }
    toast('Moved to Cart', `✅ ${product.name} moved to cart!`);
  };

  if (loading && wishlistItems.length === 0) {
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
          <p className="text-xs text-gray-500 mt-0.5">Your saved favorite products</p>
        </div>
        <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-extrabold rounded-full border border-red-200 flex items-center gap-1">
          <Heart className="w-3 h-3 fill-red-500" />
          {wishlistItems.length} {wishlistItems.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-50 mx-auto flex items-center justify-center">
            <Heart className="w-10 h-10 text-red-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Your Wishlist is Empty</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              Tap the heart icon ♥ on any product to save it for later. Your saved items will appear here.
            </p>
          </div>
          <Link
            to="/"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 mt-2 transition-all shadow-md"
          >
            <ShoppingBag className="w-4 h-4" /> Explore Store
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {wishlistItems.map((product) => {
            const prodId = product._id || product.id;
            const isInStock = product.inStock !== false;
            const price = Number(product.price) || 0;
            const discount = Number(product.discount) || 0;
            const hasDiscount = discount > 0;
            const offerPrice = hasDiscount ? Math.round(price * (1 - discount / 100) * 100) / 100 : null;
            const isInCart = cartItems.some(item => item.product === prodId);

            return (
              <div
                key={prodId}
                className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative"
              >
                {/* Discount badge */}
                {hasDiscount && (
                  <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow flex items-center gap-0.5">
                    <Tag className="w-2.5 h-2.5" />
                    {discount}% OFF
                  </div>
                )}

                {/* Offer tag badge */}
                {product.offerTag && !hasDiscount && (
                  <div className="absolute top-3 left-3 z-10 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow">
                    {product.offerTag}
                  </div>
                )}

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
                    onClick={() => handleRemove(prodId)}
                    className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full shadow-sm backdrop-blur-sm transition-all"
                    title="Remove from Wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">{product.name}</h4>
                  {(product.tamilName || product.nameTamil) && (
                    <p className="text-[11px] text-green-700 font-semibold mt-0.5 line-clamp-1">
                      {product.tamilName || product.nameTamil}
                    </p>
                  )}
                  {product.unit && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{product.unit}</p>
                  )}

                  {/* Price section */}
                  <div className="flex items-center gap-2 mt-2 mb-3">
                    {hasDiscount ? (
                      <>
                        <span className="text-base font-extrabold text-green-600">{formatCurrency(offerPrice)}</span>
                        <span className="text-xs text-gray-400 line-through">{formatCurrency(price)}</span>
                      </>
                    ) : (
                      <span className="text-base font-extrabold text-green-600">{formatCurrency(price)}</span>
                    )}
                    <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      isInStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isInStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-auto">
                  <button
                    disabled={!isInStock}
                    onClick={() => handleAddToCart(product)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                      isInStock
                        ? isInCart
                          ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                          : 'bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-600/20'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={isInCart ? 'Already in Cart' : 'Add to Cart'}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {isInCart ? 'In Cart' : 'Add to Cart'}
                  </button>
                  <button
                    disabled={!isInStock}
                    onClick={() => handleMoveToCart(product)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                      isInStock
                        ? 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                    title="Move to Cart (removes from wishlist)"
                  >
                    Move
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WishlistTab;
