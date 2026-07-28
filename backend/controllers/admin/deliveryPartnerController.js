import prisma from '../../utils/prismaClient.js';
import bcrypt from 'bcryptjs';
import { formatMongoCompat } from '../../utils/formatMongoCompat.js';
import crypto from 'crypto';

// Helper to generate a random 8-character password
const generateTempPassword = () => {
  return crypto.randomBytes(4).toString('hex');
};

// @desc    Get all delivery partners
// @route   GET /api/admin/delivery-partners
// @access  Private/Admin
export const getDeliveryPartners = async (req, res) => {
  try {
    const partners = await prisma.deliveryPartner.findMany({
      include: { documents: true },
      orderBy: { createdAt: 'desc' },
    });
    
    // Format for frontend compatibility
    const formattedPartners = partners.map(partner => {
      const { password, ...partnerWithoutPassword } = partner;
      return formatMongoCompat(partnerWithoutPassword);
    });

    res.json(formattedPartners);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a delivery partner
// @route   POST /api/admin/delivery-partners
// @access  Private/Admin
export const createDeliveryPartner = async (req, res) => {
  const { name, email, mobile, vehicleNumber, vehicleType, emergencyContact, status } = req.body;

  try {
    const existingPartner = await prisma.deliveryPartner.findFirst({
      where: {
        OR: [{ email }, { mobile }]
      }
    });

    if (existingPartner) {
      return res.status(400).json({ message: 'Delivery Partner with this email or mobile already exists' });
    }

    // Auto-generate employeeId (e.g., DP001)
    const count = await prisma.deliveryPartner.count();
    const employeeId = `DP${String(count + 1).padStart(3, '0')}`;

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const partner = await prisma.deliveryPartner.create({
      data: {
        employeeId,
        name,
        email,
        mobile,
        password: hashedPassword,
        vehicleNumber,
        vehicleType: vehicleType || 'Two Wheeler',
        emergencyContact,
        status: status || 'Available'
      }
    });

    const { password: _, ...partnerWithoutPassword } = partner;
    // Return tempPassword so admin can share it with the partner
    res.status(201).json({ ...formatMongoCompat(partnerWithoutPassword), tempPassword });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update delivery partner
// @route   PUT /api/admin/delivery-partners/:id
// @access  Private/Admin
export const updateDeliveryPartner = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, vehicleNumber, vehicleType, emergencyContact, status, isActive } = req.body;

  try {
    const partner = await prisma.deliveryPartner.findUnique({ where: { id } });

    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    const updatedPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        name: name || partner.name,
        email: email || partner.email,
        mobile: mobile || partner.mobile,
        vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : partner.vehicleNumber,
        vehicleType: vehicleType !== undefined ? vehicleType : partner.vehicleType,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : partner.emergencyContact,
        status: status || partner.status,
        isActive: isActive !== undefined ? isActive : partner.isActive,
      }
    });

    const { password: _, ...partnerWithoutPassword } = updatedPartner;
    res.json(formatMongoCompat(partnerWithoutPassword));
  } catch (error) {
    if (error.code === 'P2002') {
       return res.status(400).json({ message: 'Email or Mobile already in use' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Reset password for delivery partner
// @route   PUT /api/admin/delivery-partners/:id/reset-password
// @access  Private/Admin
export const resetPassword = async (req, res) => {
  const { id } = req.params;

  try {
    const partner = await prisma.deliveryPartner.findUnique({ where: { id } });

    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    await prisma.deliveryPartner.update({
      where: { id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password reset successfully', tempPassword });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get delivery analytics for Admin Dashboard
// @route   GET /api/admin/delivery-partners/analytics
// @access  Private/Admin
export const getDeliveryAnalytics = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalPartners,
      availablePartners,
      onDeliveryPartners,
      offlinePartners,
      inactivePartners,
      completedToday,
      completedThisMonth,
      activeOrders
    ] = await Promise.all([
      prisma.deliveryPartner.count(),
      prisma.deliveryPartner.count({ where: { status: 'Available', isActive: true } }),
      prisma.deliveryPartner.count({ where: { status: 'On Delivery', isActive: true } }),
      prisma.deliveryPartner.count({ where: { status: 'Offline', isActive: true } }),
      prisma.deliveryPartner.count({ where: { isActive: false } }),
      prisma.order.count({
        where: {
          isDelivered: true,
          deliveredAt: { gte: startOfToday }
        }
      }),
      prisma.order.count({
        where: {
          isDelivered: true,
          deliveredAt: { gte: startOfMonth }
        }
      }),
      prisma.order.count({
        where: {
          deliveryPartnerId: { not: null },
          isDelivered: false
        }
      })
    ]);

    res.json({
      partners: {
        total: totalPartners,
        available: availablePartners,
        onDelivery: onDeliveryPartners,
        offline: offlinePartners,
        inactive: inactivePartners
      },
      orders: {
        completedToday,
        completedThisMonth,
        active: activeOrders
      }
    });
  } catch (error) {
    console.error('Error fetching delivery analytics:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all delivery partners earnings and settlements
// @route   GET /api/admin/delivery-earnings
// @access  Private/Admin
export const getAllDeliveryEarnings = async (req, res) => {
  try {
    const partners = await prisma.deliveryPartner.findMany({
      include: {
        earnings: true,
        settlements: true
      },
      orderBy: { name: 'asc' }
    });

    const data = partners.map(p => {
      const pendingAmount = p.earnings.filter(e => !e.isSettled).reduce((acc, e) => acc + e.totalEarned, 0);
      const paidAmount = p.earnings.filter(e => e.isSettled).reduce((acc, e) => acc + e.totalEarned, 0);
      return {
        id: p.id,
        name: p.name,
        employeeId: p.employeeId,
        mobile: p.mobile,
        completedDeliveries: p.earnings.length,
        pendingAmount,
        paidAmount,
        totalLifetimeEarnings: pendingAmount + paidAmount
      };
    });

    res.json({ success: true, earnings: data });
  } catch (error) {
    console.error('Error fetching admin earnings:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Mark settlement as paid for a partner
// @route   POST /api/admin/delivery-earnings/:id/settle
// @access  Private/Admin
export const paySettlement = async (req, res) => {
  try {
    const partnerId = req.params.id;
    const { referenceId } = req.body;

    const pendingEarnings = await prisma.deliveryEarnings.findMany({
      where: { partnerId, isSettled: false }
    });

    if (pendingEarnings.length === 0) {
      return res.status(400).json({ message: 'No pending earnings to settle' });
    }

    const totalAmount = pendingEarnings.reduce((acc, e) => acc + e.totalEarned, 0);

    const settlement = await prisma.$transaction(async (prisma) => {
      const newSettlement = await prisma.settlement.create({
        data: {
          partnerId,
          amount: totalAmount,
          status: 'Paid',
          paidAt: new Date(),
          referenceId: referenceId || ''
        }
      });

      await prisma.deliveryEarnings.updateMany({
        where: { partnerId, isSettled: false },
        data: { isSettled: true, settlementId: newSettlement.id }
      });

      return newSettlement;
    });

    res.json({ success: true, settlement, message: 'Settlement marked as paid' });
  } catch (error) {
    console.error('Error paying settlement:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Verify delivery partner document
// @route   POST /api/admin/delivery-partners/:id/verify
// @access  Private/Admin
export const verifyDeliveryPartnerDocument = async (req, res) => {
  try {
    const partnerId = req.params.id;
    const { status, rejectionReason } = req.body; // status: 'Approved' or 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const document = await prisma.deliveryPartnerDocument.findUnique({
      where: { partnerId }
    });

    if (!document) {
      return res.status(404).json({ message: 'No documents uploaded by this partner.' });
    }

    await prisma.$transaction([
      prisma.deliveryPartnerDocument.update({
        where: { partnerId },
        data: {
          status,
          rejectionReason: status === 'Rejected' ? rejectionReason : null,
          verifiedAt: new Date(),
          verifierName: req.admin?.name || 'Admin'
        }
      }),
      prisma.deliveryPartner.update({
        where: { id: partnerId },
        data: {
          isVerified: status === 'Approved',
          status: status === 'Rejected' ? 'Inactive' : undefined
        }
      })
    ]);

    res.json({ success: true, message: `Partner documents ${status.toLowerCase()}` });
  } catch (error) {
    console.error('Error verifying partner document:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
