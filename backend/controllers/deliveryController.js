import prisma from '../utils/prismaClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Auth delivery partner & get token
// @route   POST /api/delivery/login
// @access  Public
export const loginDeliveryPartner = async (req, res) => {
  const { mobile, password } = req.body;

  try {
    if (!mobile || !password) {
      return res.status(400).json({ message: 'Please provide mobile and password' });
    }

    const partner = await prisma.deliveryPartner.findUnique({
      where: { mobile },
    });

    if (partner && (await bcrypt.compare(password, partner.password))) {
      if (!partner.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated.' });
      }

      const { password: _, ...partnerWithoutPassword } = partner;
      const formattedPartner = formatMongoCompat(partnerWithoutPassword);

      res.json({
        ...formattedPartner,
        token: generateToken(partner.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid mobile or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get partner profile
// @route   GET /api/delivery/profile
// @access  Private (Delivery Partner)
export const getDeliveryProfile = async (req, res) => {
  try {
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: req.partner.id },
    });

    if (partner) {
      const { password: _, ...partnerWithoutPassword } = partner;
      res.json(formatMongoCompat(partnerWithoutPassword));
    } else {
      res.status(404).json({ message: 'Partner not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update partner profile
// @route   PUT /api/delivery/profile
// @access  Private (Delivery Partner)
export const updateDeliveryProfile = async (req, res) => {
  try {
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: req.partner.id },
    });

    if (partner) {
      const updatedPartner = await prisma.deliveryPartner.update({
        where: { id: req.partner.id },
        data: {
          name: req.body.name || partner.name,
          email: req.body.email || partner.email,
          mobile: req.body.mobile || partner.mobile,
          vehicleNumber: req.body.vehicleNumber || partner.vehicleNumber,
          status: req.body.status || partner.status,
          profileImage: req.body.profileImage || partner.profileImage,
        },
      });

      const { password: _, ...partnerWithoutPassword } = updatedPartner;
      const formattedPartner = formatMongoCompat(partnerWithoutPassword);

      res.json({
        ...formattedPartner,
        token: generateToken(partner.id),
      });
    } else {
      res.status(404).json({ message: 'Partner not found' });
    }
  } catch (error) {
    if (error.code === 'P2002') {
       return res.status(400).json({ message: 'Email or Mobile already in use' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Logout partner
// @route   POST /api/delivery/logout
// @access  Private (Delivery Partner)
export const logoutDeliveryPartner = async (req, res) => {
  try {
    // Client-side will remove the token. 
    // Here we just return success.
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Change password
// @route   PUT /api/delivery/profile/password
// @access  Private (Delivery Partner)
export const updateDeliveryPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide both current and new passwords' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: req.partner.id },
    });

    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    if (!(await bcrypt.compare(currentPassword, partner.password))) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.deliveryPartner.update({
      where: { id: req.partner.id },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
