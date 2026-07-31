/**
 * Optimizes a Cloudinary image URL by appending WebP formatting, auto-quality, and sizing parameters.
 * If the URL is not a Cloudinary URL, it returns the original URL.
 * 
 * @param {string} url - The original image URL.
 * @param {object} options - Options for optimization.
 * @param {number} [options.width] - Optional width.
 * @param {number} [options.height] - Optional height.
 * @returns {string} - The optimized URL.
 */
export const optimizeImage = (url, { width, height } = {}) => {
  if (!url || typeof url !== 'string') return url;
  
  // Only optimize Cloudinary URLs
  if (!url.includes('res.cloudinary.com')) return url;

  // Check if it already has transformations to avoid double-appending
  if (url.includes('/upload/f_') || url.includes('/upload/q_')) return url;

  let transformations = 'f_webp,q_auto'; // Force webp, auto compress quality
  
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height}`;
  
  // Cloudinary URLs usually follow: https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>
  return url.replace('/upload/', `/upload/${transformations}/`);
};
