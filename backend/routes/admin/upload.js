import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protectAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/upload', protectAdmin, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const urls = req.files.map(file => `${protocol}://${host}/uploads/${file.filename}`);
    res.json({ urls });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Upload failed: ' + error.message });
  }
});

export const productUpdateUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

export default router;
