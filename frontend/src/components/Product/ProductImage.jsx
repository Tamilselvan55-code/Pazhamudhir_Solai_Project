import React, { useState, useRef, useCallback } from 'react';

/**
 * Category-aware product image placeholders.
 * Each returns an inline SVG data URI — zero external dependencies, zero network requests.
 */
const CATEGORY_PLACEHOLDERS = {
  vegetables: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#f0fdf4" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🥦</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#16a34a" font-family="sans-serif" font-weight="600">Vegetables</text></svg>')}`,
  greens: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#f0fdf4" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🌿</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#16a34a" font-family="sans-serif" font-weight="600">Greens</text></svg>')}`,
  fruits: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#fff7ed" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🍎</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#ea580c" font-family="sans-serif" font-weight="600">Fruits</text></svg>')}`,
  dairy: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#eff6ff" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🥛</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#2563eb" font-family="sans-serif" font-weight="600">Dairy</text></svg>')}`,
  milk: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#eff6ff" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🥛</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#2563eb" font-family="sans-serif" font-weight="600">Milk</text></svg>')}`,
  oils: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#fffbeb" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🛢️</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#b45309" font-family="sans-serif" font-weight="600">Oils</text></svg>')}`,
  snacks: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#fefce8" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🍿</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#ca8a04" font-family="sans-serif" font-weight="600">Snacks</text></svg>')}`,
  biscuits: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#fffbeb" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🍪</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#b45309" font-family="sans-serif" font-weight="600">Biscuits</text></svg>')}`,
  masala: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#fef2f2" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🌶️</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#dc2626" font-family="sans-serif" font-weight="600">Masala</text></svg>')}`,
  pickles: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#fff1f2" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🥭</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#e11d48" font-family="sans-serif" font-weight="600">Pickles</text></svg>')}`,
  coffee: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#faf5f0" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">☕</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#78350f" font-family="sans-serif" font-weight="600">Coffee</text></svg>')}`,
  detergents: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#ecfeff" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🧼</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#0891b2" font-family="sans-serif" font-weight="600">Detergents</text></svg>')}`,
  chocolate: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#faf5f0" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">🍫</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#78350f" font-family="sans-serif" font-weight="600">Chocolate</text></svg>')}`,
};

const DEFAULT_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#f9fafb" width="200" height="200"/><text x="100" y="90" text-anchor="middle" font-size="48">📦</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="#6b7280" font-family="sans-serif" font-weight="600">Product</text></svg>')}`;

/**
 * Resolve category name to a slug key for placeholder lookup.
 */
const getCategoryKey = (category) => {
  if (!category) return null;
  const name = typeof category === 'string'
    ? category
    : category?.name || category?.slug || '';
  const n = name.toLowerCase().trim();
  if (n.includes('vegetable') || n === 'vegetables' || n.includes('veg')) return 'vegetables';
  if (n.includes('green') || n === 'greens') return 'greens';
  if (n.includes('fruit')) return 'fruits';
  if (n.includes('dairy') || n.includes('milk')) return 'dairy';
  if (n.includes('oil')) return 'oils';
  if (n.includes('snack') || n.includes('savor')) return 'snacks';
  if (n.includes('biscuit') || n.includes('cookie')) return 'biscuits';
  if (n.includes('masala') || n.includes('spice')) return 'masala';
  if (n.includes('pickle')) return 'pickles';
  if (n.includes('coffee') || n.includes('tea')) return 'coffee';
  if (n.includes('detergent') || n.includes('cleaner') || n.includes('soap')) return 'detergents';
  if (n.includes('chocolate')) return 'chocolate';
  return null;
};

/**
 * Get the appropriate placeholder image for a product category.
 * @param {string|object|null} category - Category name, slug, or object
 * @returns {string} Data URI of the placeholder SVG
 */
export const getPlaceholderForCategory = (category) => {
  const key = getCategoryKey(category);
  return (key && CATEGORY_PLACEHOLDERS[key]) || DEFAULT_PLACEHOLDER;
};

/**
 * ProductImage — Production-grade image component with:
 * - Lazy loading via loading="lazy"
 * - CSS skeleton shimmer while loading
 * - One retry attempt on load failure
 * - Category-aware SVG placeholder fallback
 * - Never shows broken image icon
 *
 * @param {object} props
 * @param {string} props.src - Image URL
 * @param {string} props.alt - Alt text
 * @param {string} [props.className] - CSS classes for the <img>
 * @param {object} [props.style] - Inline styles for the <img>
 * @param {string|object} [props.category] - Product category for fallback
 * @param {'cover'|'contain'} [props.fit='contain'] - Object-fit mode
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Size hint for skeleton
 */
const ProductImage = ({
  src,
  alt,
  className = '',
  style = {},
  category = null,
  fit = 'contain',
  size = 'md',
}) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'error'
  const retriedRef = useRef(false);
  const imgRef = useRef(null);

  const placeholder = getPlaceholderForCategory(category);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
  }, []);

  const handleError = useCallback(() => {
    // Retry once with cache-busting
    if (!retriedRef.current && src) {
      retriedRef.current = true;
      const separator = src.includes('?') ? '&' : '?';
      if (imgRef.current) {
        imgRef.current.src = `${src}${separator}_retry=1`;
      }
      return;
    }
    // After retry fails, show category placeholder
    setStatus('error');
    if (imgRef.current) {
      imgRef.current.src = placeholder;
    }
  }, [src, placeholder]);

  // Determine actual source
  const actualSrc = (!src || src.trim() === '') ? placeholder : src;
  const showSkeleton = status === 'loading' && actualSrc !== placeholder;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ minHeight: size === 'sm' ? 24 : size === 'lg' ? 144 : 64 }}>
      {/* Skeleton shimmer */}
      {showSkeleton && (
        <div
          className="absolute inset-0 bg-gray-100 animate-pulse"
          style={{ borderRadius: 'inherit' }}
        />
      )}
      <img
        ref={imgRef}
        src={actualSrc}
        alt={alt || 'Product'}
        loading="lazy"
        className={`${className} ${showSkeleton ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        style={{ objectFit: fit, ...style }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

export default ProductImage;
