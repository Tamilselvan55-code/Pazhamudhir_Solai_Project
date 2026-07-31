import prisma from '../utils/prismaClient.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';

// @desc    Get orders assigned to logged in delivery partner
// @route   GET /api/delivery/orders
// @access  Private (Delivery Partner)
export const getAssignedOrders = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const history = req.query.history === 'true';

    let where;
    if (history) {
      // Full history: all delivered orders for this partner (all time)
      where = {
        deliveryPartnerId: partnerId,
        isDelivered: true
      };
    } else {
      // Default: active orders + today's completed
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      where = {
        deliveryPartnerId: partnerId,
        OR: [
          { isDelivered: false },
          { deliveredAt: { gte: startOfToday } }
        ]
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { fullName: true, phoneNumber: true } },
        orderItems: { include: { product: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      ...(history ? { take: 50 } : {})
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update delivery status of an order
// @route   PATCH /api/delivery/orders/:id/status
// @access  Private (Delivery Partner)
export const updateOrderStatus = async (req, res) => {
  try {
    const { action } = req.body; // 'Accept Order', 'Picked Up', 'Out For Delivery'
    const partnerId = req.partner.id;
    const orderId = req.params.id;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryPartnerId !== partnerId) {
      return res.status(403).json({ message: 'Unauthorized. Order assigned to another partner.' });
    }

    const now = new Date();
    let updateData = {};
    let partnerUpdate = {};

    // Validate sequential steps and set data
    if (action === 'Accept Order') {
      if (order.deliveryAcceptedAt) return res.status(400).json({ message: 'Order has already been accepted.' });
      updateData.deliveryAcceptedAt = now;
      updateData.status = 'Accepted';
      
      const newHistoryEntry = { status: 'Accepted', note: 'Delivery partner accepted the order', date: now.toISOString() };
      updateData.statusHistory = order.statusHistory && Array.isArray(order.statusHistory)
        ? [...order.statusHistory, newHistoryEntry]
        : [newHistoryEntry];
    } 
    else if (action === 'Picked Up' || action === 'Pick Up Order') {
      if (!order.deliveryAcceptedAt) return res.status(400).json({ message: 'You must Accept Order first.' });
      if (order.pickedUpAt) return res.status(400).json({ message: 'Order has already been picked up.' });
      updateData.pickedUpAt = now;
      updateData.status = 'Picked Up';
      
      const newHistoryEntry = { status: 'Picked Up', note: 'Order picked up by delivery partner', date: now.toISOString() };
      updateData.statusHistory = order.statusHistory && Array.isArray(order.statusHistory)
        ? [...order.statusHistory, newHistoryEntry]
        : [newHistoryEntry];
    } 
    else if (action === 'Out For Delivery') {
      if (!order.pickedUpAt) return res.status(400).json({ message: 'You must mark Picked Up first.' });
      if (order.outForDeliveryAt) return res.status(400).json({ message: 'Order is already Out For Delivery.' });
      
      // Phase 14: Generate 4-digit OTP when partner marks Out For Delivery
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

      updateData.outForDeliveryAt = now;
      updateData.status = 'Out for Delivery';
      updateData.deliveryOtp = otp;
      updateData.deliveryOtpExpiry = otpExpiry;
      updateData.deliveryOtpVerified = false;
      
      const newHistoryEntry = { status: 'Out for Delivery', note: 'Order is out for delivery', date: now.toISOString() };
      updateData.statusHistory = order.statusHistory && Array.isArray(order.statusHistory)
        ? [...order.statusHistory, newHistoryEntry]
        : [newHistoryEntry];

      // After update, notify customer with OTP via socket + notification
      const io = req.app?.get('io');
      if (io && order.userId) {
        io.to(`user:${order.userId}`).emit('otp_generated', {
          orderId,
          otp,
          invoiceNumber: order.invoiceNumber,
          message: `Your delivery OTP is ${otp}. Share it ONLY after receiving your order.`
        });
      }

      // Save update first, then send notification
      await prisma.order.update({ where: { id: orderId }, data: updateData });

      if (order.userId) {
        await createAndEmitNotification(io, {
          userId: order.userId,
          title: '🔐 Your Delivery OTP',
          message: `Your delivery OTP for order ${order.invoiceNumber || orderId.slice(-6).toUpperCase()} is ${otp}. Share it only after receiving your order. Valid for 10 minutes.`,
          type: 'delivery',
          role: 'customer',
          actionUrl: '/profile?tab=orders',
          orderId: order.id,
          invoiceNumber: order.invoiceNumber || ''
        });
      }

      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { fullName: true, phoneNumber: true } } }
      });

      if (io) {
        io.emit('order_status_updated', { orderId, status: 'Out for Delivery', action });
      }

      return res.json({ success: true, order: updatedOrder, message: 'Successfully marked as Out For Delivery. OTP generated for customer.' });
    } 
    else {
      return res.status(400).json({ message: 'Invalid action. Use /verify-otp to complete delivery.' });
    }

    const transactionTasks = [
      prisma.order.update({
        where: { id: orderId },
        data: updateData
      })
    ];

    if (Object.keys(partnerUpdate).length > 0) {
      transactionTasks.push(prisma.deliveryPartner.update(partnerUpdate));
    }

    await prisma.$transaction(transactionTasks);

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { fullName: true, phoneNumber: true } }
      }
    });

    const io = req.app?.get('io');
    if (io) {
      io.emit('admin_notification', {
        title: `Order ${action}`,
        message: `Delivery partner has marked order ${updatedOrder.invoiceNumber || orderId.slice(-6).toUpperCase()} as ${action}`,
        type: 'order',
        link: `/admin/orders?search=${updatedOrder.invoiceNumber || orderId}`
      });
      io.emit('order_status_updated', {
        orderId,
        status: updatedOrder.status,
        action
      });
    }

    res.json({ success: true, order: updatedOrder, message: `Successfully marked as ${action}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify delivery OTP and complete delivery (Phase 14)
// @route   POST /api/delivery/orders/:id/verify-otp
// @access  Private (Delivery Partner)
export const verifyDeliveryOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const partnerId = req.partner.id;
    const orderId = req.params.id;

    if (!otp || otp.length !== 4) {
      return res.status(400).json({ message: 'Please enter a valid 4-digit OTP' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.deliveryPartnerId !== partnerId) return res.status(403).json({ message: 'Unauthorized' });
    if (!order.outForDeliveryAt) return res.status(400).json({ message: 'Order must be Out For Delivery before OTP verification' });
    if (order.isDelivered) return res.status(400).json({ message: 'Order already delivered' });
    if (order.deliveryOtpVerified) return res.status(400).json({ message: 'OTP already used' });

    if (!order.deliveryOtp) return res.status(400).json({ message: 'No OTP generated for this order' });

    // Check expiry
    if (order.deliveryOtpExpiry && new Date() > new Date(order.deliveryOtpExpiry)) {
      return res.status(400).json({ message: 'OTP has expired. Please ask admin to regenerate.' });
    }

    // Validate OTP (server-side only)
    if (String(otp).trim() !== String(order.deliveryOtp).trim()) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    const now = new Date();
    const newHistoryEntry = { status: 'Delivered', note: 'Order delivered and OTP verified', date: now.toISOString() };
    const updatedHistory = order.statusHistory && Array.isArray(order.statusHistory)
      ? [...order.statusHistory, newHistoryEntry]
      : [newHistoryEntry];

    // Phase 17: Calculate Earnings
    const distanceKm = order.shippingAddress?.distanceFromStore || 0;
    const baseEarnings = 30;
    let distanceBonus = 0;
    if (distanceKm > 3) {
      distanceBonus = (distanceKm - 3) * 5; // 5 Rs per extra km
    }
    
    // Peak hour bonus (6 PM - 9 PM)
    const currentHour = now.getHours();
    const peakHourBonus = (currentHour >= 18 && currentHour <= 21) ? 10 : 0;
    
    const totalEarned = baseEarnings + distanceBonus + peakHourBonus;

    // Mark delivered, OTP verified, and generate earnings in one transaction
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          deliveredAt: now,
          isDelivered: true,
          status: 'Delivered',
          deliveryOtpVerified: true,
          statusHistory: updatedHistory
        }
      }),
      prisma.deliveryPartner.update({
        where: { id: partnerId },
        data: { status: 'Available' }
      }),
      prisma.deliveryEarnings.create({
        data: {
          partnerId,
          orderId,
          distanceKm,
          baseEarnings,
          distanceBonus,
          peakHourBonus,
          totalEarned
        }
      })
    ]);

    const io = req.app?.get('io');

    // Notify customer: OTP verified + delivered
    if (order.userId) {
      await createAndEmitNotification(io, {
        userId: order.userId,
        title: '✅ Order Delivered!',
        message: `Your order ${order.invoiceNumber || orderId.slice(-6).toUpperCase()} has been delivered successfully. OTP verified.`,
        type: 'delivery',
        role: 'customer',
        actionUrl: '/profile?tab=orders',
        orderId: order.id,
        invoiceNumber: order.invoiceNumber || ''
      });

      // Emit otp_verified to customer room
      if (io) {
        io.to(`user:${order.userId}`).emit('otp_verified', {
          orderId,
          invoiceNumber: order.invoiceNumber,
          message: 'Your order has been delivered. OTP verified successfully.'
        });
      }
    }

    if (io) {
      io.emit('order_status_updated', { orderId, status: 'Delivered', action: 'Delivered' });
      io.emit('admin_notification', {
        title: 'Order Delivered',
        message: `Order ${order.invoiceNumber || orderId.slice(-6).toUpperCase()} delivered & OTP verified.`,
        type: 'order'
      });
    }

    res.json({ success: true, message: 'OTP verified! Order marked as Delivered.' });
  } catch (error) {
    console.error('[VERIFY OTP ERROR]:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

// @desc    Reject an assigned order (before accepting)
// @route   POST /api/delivery/orders/:id/reject
// @access  Private (Delivery Partner)
export const rejectOrder = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const orderId = req.params.id;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.deliveryPartnerId !== partnerId) {
      return res.status(403).json({ message: 'Unauthorized. Order is not assigned to you.' });
    }

    // Block rejection after already accepted/picked up
    if (order.deliveryAcceptedAt) {
      return res.status(400).json({ message: 'Cannot reject an order you have already accepted. Contact admin.' });
    }

    const now = new Date();
    const newHistoryEntry = {
      status: order.status,
      note: `Delivery partner rejected this assignment`,
      date: now.toISOString()
    };
    const updatedHistory = Array.isArray(order.statusHistory)
      ? [...order.statusHistory, newHistoryEntry]
      : [newHistoryEntry];

    await prisma.$transaction([
      prisma.deliveryPartner.update({
        where: { id: partnerId },
        data: { status: 'Available' }
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId: null,
          deliveryAssignedAt: null,
          statusHistory: updatedHistory
        }
      })
    ]);

    // Notify admin via socket
    const io = req.app?.get('io');
    if (io) {
      io.emit('delivery_rejected', {
        orderId,
        partnerId,
        invoiceNumber: order.invoiceNumber,
        message: `Delivery partner rejected assignment for order ${order.invoiceNumber || orderId.slice(-6).toUpperCase()}`
      });
    }

    res.json({ success: true, message: 'Assignment rejected. Order is now unassigned.' });
  } catch (error) {
    console.error('[DELIVERY] Reject order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
