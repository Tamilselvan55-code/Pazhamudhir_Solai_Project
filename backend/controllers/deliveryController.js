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
          vehicleType: req.body.vehicleType || partner.vehicleType,
          emergencyContact: req.body.emergencyContact || partner.emergencyContact,
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

// @desc    Get delivery partner analytics
// @route   GET /api/delivery/analytics
// @access  Private (Delivery Partner)
export const getDeliveryPartnerAnalytics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayCount, weeklyCount, monthlyCount, totalDelivered, earningsAggr] = await Promise.all([
      prisma.order.count({
        where: {
          deliveryPartnerId: req.partner.id,
          status: 'Delivered',
          deliveredAt: { gte: today }
        }
      }),
      prisma.order.count({
        where: {
          deliveryPartnerId: req.partner.id,
          status: 'Delivered',
          deliveredAt: { gte: startOfWeek }
        }
      }),
      prisma.order.count({
        where: {
          deliveryPartnerId: req.partner.id,
          status: 'Delivered',
          deliveredAt: { gte: startOfMonth }
        }
      }),
      prisma.order.count({
        where: {
          deliveryPartnerId: req.partner.id,
          status: 'Delivered'
        }
      }),
      prisma.deliveryEarnings.aggregate({
        where: { partnerId: req.partner.id },
        _sum: { totalEarned: true }
      })
    ]);

    const totalEarnings = earningsAggr._sum.totalEarned || 0;
    
    // Calculate average rating
    const ratingAggr = await prisma.order.aggregate({
      where: {
        deliveryPartnerId: req.partner.id,
        status: 'Delivered',
        customerRating: { not: null }
      },
      _avg: { customerRating: true }
    });
    
    const rating = ratingAggr._avg.customerRating ? Number(ratingAggr._avg.customerRating).toFixed(1) : 'No Rating';
    const acceptanceRate = 100; // Mock until rejection logic is fully tracked

    res.json({
      deliveriesToday: todayCount,
      weeklyDeliveries: weeklyCount,
      monthlyDeliveries: monthlyCount,
      totalEarnings,
      rating,
      acceptanceRate
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update partner live location
// @route   POST /api/delivery/location
// @access  Private (Delivery Partner)
export const updateDeliveryLocation = async (req, res) => {
  const { lat, lon, orderId, heading, speed } = req.body;
  try {
    if (lat == null || lon == null) {
      return res.status(400).json({ message: 'Coordinates (lat, lon) required' });
    }
    const io = req.app?.get('io');
    const locationData = {
      partnerId: req.partner.id,
      partnerName: req.partner.name,
      orderId: orderId || null,
      lat,
      lon,
      heading: heading || 0,
      speed: speed || 0,
      timestamp: new Date().toISOString()
    };
    if (io) {
      io.emit('partner_location_changed', locationData);
      if (orderId) {
        io.emit(`order_location_${orderId}`, locationData);
      }
    }
    res.json({ success: true, location: locationData });
  } catch (error) {
    console.error('Location Update Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get delivery earnings history and summary
// @route   GET /api/delivery/earnings
// @access  Private (Delivery Partner)
export const getDeliveryEarnings = async (req, res) => {
  try {
    const earnings = await prisma.deliveryEarnings.findMany({
      where: { partnerId: req.partner.id },
      include: {
        order: { select: { invoiceNumber: true, user: { select: { fullName: true } } } },
        settlement: { select: { status: true, paidAt: true, referenceId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const pendingAmount = earnings.filter(e => !e.isSettled).reduce((acc, curr) => acc + curr.totalEarned, 0);
    const paidAmount = earnings.filter(e => e.isSettled).reduce((acc, curr) => acc + curr.totalEarned, 0);
    
    res.json({
      success: true,
      earnings,
      summary: {
        pendingAmount,
        paidAmount,
        totalDeliveries: earnings.length
      }
    });
  } catch (error) {
    console.error('Earnings Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get delivery partner documents
// @route   GET /api/delivery/documents
// @access  Private (Delivery Partner)
export const getDeliveryDocuments = async (req, res) => {
  try {
    const documents = await prisma.deliveryPartnerDocument.findUnique({
      where: { partnerId: req.partner.id }
    });
    res.json({ success: true, documents });
  } catch (error) {
    console.error('Fetch Documents Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload delivery partner documents
// @route   POST /api/delivery/documents
// @access  Private (Delivery Partner)
export const uploadDeliveryDocuments = async (req, res) => {
  try {
    const { drivingLicense, governmentId, vehicleRegistration, insuranceCertificate, vehiclePhoto } = req.body;
    
    const dataToUpdate = {
      status: 'Pending',
      rejectionReason: null
    };
    if (drivingLicense) dataToUpdate.drivingLicense = drivingLicense;
    if (governmentId) dataToUpdate.governmentId = governmentId;
    if (vehicleRegistration) dataToUpdate.vehicleRegistration = vehicleRegistration;
    if (insuranceCertificate) dataToUpdate.insuranceCertificate = insuranceCertificate;
    if (vehiclePhoto) dataToUpdate.vehiclePhoto = vehiclePhoto;

    const documents = await prisma.deliveryPartnerDocument.upsert({
      where: { partnerId: req.partner.id },
      update: dataToUpdate,
      create: {
        partnerId: req.partner.id,
        ...dataToUpdate
      }
    });

    res.json({ success: true, documents, message: 'Documents uploaded successfully for review.' });
  } catch (error) {
    console.error('Upload Documents Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Notification Endpoints ───────────────────────────────────────────────

export const getDeliveryNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { deliveryPartnerId: req.partner.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

export const markDeliveryNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.deliveryPartnerId !== req.partner.id) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
};

export const markAllDeliveryNotificationsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { deliveryPartnerId: req.partner.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error marking all as read' });
  }
};
