import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['png', 'jpg', 'jpeg', 'webp'],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const nameWithoutExt = file.originalname
        ? file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')
        : 'image';
      return `${nameWithoutExt}-${uniqueSuffix}`;
    }
  }
});

const allowedMimetypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PNG, JPEG, JPG, and WEBP images are allowed.');
    error.status = 400;
    cb(error, false);
  }
};

export const uploadCloudinary = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export const getCloudinaryPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return null;

  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let pathAfterUpload = parts[1];
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    const lastDotIndex = pathAfterUpload.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      return pathAfterUpload.substring(0, lastDotIndex);
    }
    return pathAfterUpload;
  } catch (err) {
    console.error('Error extracting Cloudinary public_id:', err);
    return null;
  }
};

export const deleteCloudinaryImage = async (url) => {
  const publicId = getCloudinaryPublicId(url);
  if (publicId) {
    try {
      console.log(`[Cloudinary] Deleting old image public_id: ${publicId}`);
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error(`[Cloudinary] Failed to delete old image (${publicId}):`, err);
    }
  }
};

export const handleCloudinaryUpload = (fieldName = 'image') => {
  return (req, res, next) => {
    uploadCloudinary.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size exceeds 10MB limit.' });
        }
        return res.status(400).json({ message: err.message || 'Image upload failed.' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided.' });
      }
      next();
    });
  };
};
