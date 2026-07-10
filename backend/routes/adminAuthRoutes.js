import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';
import { protectAdmin, requireSuperAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

// @route   POST /api/admin/auth/login
// @desc    Auth admin & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const adminRaw = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!adminRaw) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const admin = formatMongoCompat(adminRaw);

    const isMatch = await bcrypt.compare(password, admin.password);
    if (isMatch) {
      res.json({
        _id: admin._id,
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token: generateToken(admin.id),
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
    _id: req.admin._id || req.admin.id,
    id: req.admin.id || req.admin._id,
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
    const adminEmail = process.env.ADMIN_EMAIL || 'thiruchendurmurugan192@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    
    let adminRaw = await prisma.admin.findFirst({ where: { role: 'Super Admin' } });
    if (!adminRaw) {
      adminRaw = await prisma.admin.findUnique({ where: { email: adminEmail } });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (adminRaw) {
      const updatedAdminRaw = await prisma.admin.update({
        where: { id: adminRaw.id },
        data: {
          email: adminEmail,
          password: hashedPassword
        }
      });
      return res.status(200).json({ message: 'Super Admin credentials updated successfully', email: updatedAdminRaw.email });
    }

    const newAdminRaw = await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'Super Admin',
      }
    });

    res.status(201).json({ message: 'Super Admin created successfully', email: newAdminRaw.email });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: 'Failed to seed Super Admin' });
  }
});

export default router;
