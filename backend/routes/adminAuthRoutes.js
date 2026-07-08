import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { protectAdmin, requireSuperAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

// @route   POST /api/admin/auth/login
// @desc    Auth admin & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    if (admin && (await admin.matchPassword(password))) {
      res.json({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token: generateToken(admin._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/auth/profile
// @desc    Get admin profile
// @access  Private (Admin)
router.get('/profile', protectAdmin, async (req, res) => {
  res.json({
    _id: req.admin._id,
    name: req.admin.name,
    email: req.admin.email,
    role: req.admin.role,
  });
});

// @route   POST /api/admin/auth/seed
// @desc    Seed initial Super Admin
// @access  Public (Should be disabled or protected in production!)
router.post('/seed', async (req, res) => {
  try {
    let admin = await Admin.findOne({ role: 'Super Admin' });
    if (!admin) {
      admin = await Admin.findOne({ email: 'thiruchendurmurugan192@gmail.com' });
    }
    if (admin) {
      admin.email = 'thiruchendurmurugan192@gmail.com';
      admin.password = 'Admin@123';
      await admin.save();
      return res.status(200).json({ message: 'Super Admin credentials updated successfully', email: admin.email });
    }

    admin = await Admin.create({
      name: 'Super Admin',
      email: 'thiruchendurmurugan192@gmail.com',
      password: 'Admin@123',
      role: 'Super Admin',
    });

    res.status(201).json({ message: 'Super Admin created successfully', email: admin.email });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: 'Failed to seed Super Admin' });
  }
});

export default router;
