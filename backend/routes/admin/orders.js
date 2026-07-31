import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';
import { createAndEmitNotification } from '../../utils/notificationHelper.js';
import { formatOrderWithDeliveryAddress } from '../../utils/formatOrderAddress.js';

const router = express.Router();

router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, startDate, endDate } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }
    if (search) {
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(search) || /^[0-9a-fA-F]{24}$/.test(search);
      if (isUUID) {
        where.id = search;
      } else {
        where.invoiceNumber = { contains: search, mode: 'insensitive' };
      }
    }

    const total = await prisma.order.count({ where });
    const ordersRaw = await prisma.order.findMany({
      where,
      include: {
        user: { select: { fullName: true, phoneNumber: true, email: true, addresses: true } },
        orderItems: { include: { product: true } },
        deliveryPartner: { select: { name: true, mobile: true, employeeId: true, vehicleNumber: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    const formatted = ordersRaw.map(o => formatOrderWithDeliveryAddress(o));

    res.json({
      orders: formatMongoCompatArray(formatted),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Fetch admin orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const orderRaw = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { fullName: true, phoneNumber: true, email: true, addresses: true } },
        orderItems: { include: { product: true } },
        deliveryPartner: { select: { name: true, mobile: true, employeeId: true, vehicleNumber: true } }
      }
    });
    if (!orderRaw) return res.status(404).json({ message: 'Order not found' });
    const formatted = formatOrderWithDeliveryAddress(orderRaw);
    res.json(formatMongoCompat(formatted));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Waiting for Admin Approval', 'Accepted', 'Order Confirmed', 'Packing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Cancelled by Customer', 'Rejected by Store'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const orderRaw = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { user: true, orderItems: { include: { product: true } } }
    });
    if (!orderRaw) return res.status(404).json({ success: false, message: 'Order not found' });

    const allowedTransitions = {
      Pending: ["Accepted", "Cancelled", "Order Confirmed", "Rejected by Store"],
      "Waiting for Admin Approval": ["Order Confirmed", "Cancelled by Customer", "Rejected by Store"],
      Accepted: ["Packing", "Out for Delivery"],
      "Order Confirmed": ["Packing", "Out for Delivery"],
      Packing: ["Packed"],
      Packed: ["Out for Delivery"],
      "Out for Delivery": ["Delivered"],
      Delivered: [],
      Cancelled: [],
      "Cancelled by Customer": [],
      "Rejected by Store": []
    };

    const currentStatus = orderRaw.status || 'Pending';
    const nextStatuses = allowedTransitions[currentStatus] || [];

    if (!nextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status transition'
      });
    }

    let noteText = `Status changed to ${status} by admin`;
    if (status === 'Accepted') noteText = "Your order has been accepted.";
    else if (status === 'Packing') noteText = "Your order is currently being packed.";
    else if (status === 'Packed') noteText = "Your order has been packed and is ready for delivery.";
    else if (status === 'Out for Delivery') noteText = "Your order is out for delivery and will arrive shortly.";
    else if (status === 'Delivered') noteText = "Your order has been delivered successfully.";
    else if (status === 'Cancelled') noteText = "Your order has been cancelled.";
    
    const newHistoryEntry = { status, note: noteText, date: new Date().toISOString() };
    const updatedHistory = orderRaw.statusHistory && Array.isArray(orderRaw.statusHistory)
      ? [...orderRaw.statusHistory, newHistoryEntry]
      : [newHistoryEntry];

    const updateData = {
      status,
      statusHistory: updatedHistory
    };

    if (status === 'Cancelled') {
      for (const item of orderRaw.orderItems) {
        if (item.productId) {
          const prod = await prisma.product.findUnique({ where: { id: item.productId } });
          if (prod) {
            const newStock = (prod.stock || 0) + item.quantity;
            await prisma.product.update({
              where: { id: prod.id },
              data: { stock: newStock, inStock: newStock > 0 }
            });
          }
        }
      }
    }

    if (status === 'Delivered') {
      updateData.isDelivered = true;
      updateData.deliveredAt = new Date();
    }

    const updatedOrderRaw = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
      include: { user: true, orderItems: { include: { product: true } } }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', { orderId: updatedOrderRaw.id, status, invoiceNumber: updatedOrderRaw.invoiceNumber });
      io.emit('order_update', { orderId: updatedOrderRaw.id, status });
    }

    let statusTitle = 'Order Status Updated';
    let statusMessage = `Your order ${updatedOrderRaw.invoiceNumber} status is now ${status}.`;
    if (status === 'Accepted') { statusTitle = 'Order Accepted'; statusMessage = `Your order ${updatedOrderRaw.invoiceNumber} has been accepted.`; }
    else if (status === 'Out for Delivery') { statusTitle = 'Out for Delivery'; statusMessage = `Your order ${updatedOrderRaw.invoiceNumber} is out for delivery.`; }
    else if (status === 'Delivered') { statusTitle = 'Order Delivered'; statusMessage = `Your order ${updatedOrderRaw.invoiceNumber} has been delivered successfully.`; }
    else if (status === 'Cancelled') { statusTitle = 'Order Cancelled'; statusMessage = `Your order ${updatedOrderRaw.invoiceNumber} has been cancelled.`; }

    if (updatedOrderRaw.userId) {
      await createAndEmitNotification(io, {
        userId: updatedOrderRaw.userId,
        title: statusTitle,
        message: statusMessage,
        type: (status === 'Out for Delivery' || status === 'Delivered') ? 'delivery' : 'order',
        role: 'customer',
        actionUrl: '/profile'
      });
    }

    if (status === 'Accepted' || status === 'Cancelled') {
      const orderUserForNotif = updatedOrderRaw.user;
      const totalItemsForNotif = updatedOrderRaw.orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      await createAndEmitNotification(io, {
        title: status === 'Accepted' ? 'Order Accepted' : 'Order Cancelled',
        message: `Order ${updatedOrderRaw.invoiceNumber} has been ${status === 'Accepted' ? 'accepted' : 'cancelled'}.`,
        type: status === 'Accepted' ? 'order_accepted' : 'order_cancelled',
        role: 'admin',
        actionUrl: '/admin/orders',
        customerName: orderUserForNotif ? (orderUserForNotif.fullName || '') : (updatedOrderRaw.recipient?.name || ''),
        phone: orderUserForNotif ? (orderUserForNotif.phoneNumber || '') : (updatedOrderRaw.recipient?.phone || ''),
        orderId: updatedOrderRaw.id,
        invoiceNumber: updatedOrderRaw.invoiceNumber || '',
        orderTotal: updatedOrderRaw.totalPrice || 0,
        totalItems: totalItemsForNotif,
        paymentMethod: updatedOrderRaw.paymentMethod || 'COD',
        orderStatus: status
      });
    }

    // Phase 13: Automatic Delivery Partner Assignment when Packed or Accepted
    if ((status === 'Packed' || status === 'Accepted') && !updatedOrderRaw.deliveryPartnerId) {
      autoAssignDeliveryPartner(updatedOrderRaw.id, io).catch(err => {
        console.error('Auto assign background error:', err);
      });
    }

    res.json({ success: true, message: `Order status updated to ${status}.`, order: formatMongoCompat(updatedOrderRaw) });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Phase 13 Helper: Auto Assign Algorithm
export const autoAssignDeliveryPartner = async (orderId, io) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order || order.deliveryPartnerId) {
      return { success: false, message: 'Order already assigned or not found' };
    }

    // Filter available active and verified partners
    const availablePartners = await prisma.deliveryPartner.findMany({
      where: { status: 'Available', isActive: true, isVerified: true },
      include: {
        orders: {
          where: { isDelivered: false }
        }
      }
    });

    if (!availablePartners || availablePartners.length === 0) {
      if (io) {
        io.emit('no_partner_available', {
          orderId,
          invoiceNumber: order.invoiceNumber,
          message: `Order ${order.invoiceNumber || orderId.slice(-6).toUpperCase()} is ready for delivery but no delivery partners are currently Available.`
        });
      }
      await prisma.adminNotification.create({
        data: {
          type: 'delivery',
          message: `Order ${order.invoiceNumber || orderId.slice(-6).toUpperCase()} is ready but no delivery partner is currently Available. Manual assignment required.`
        }
      }).catch(() => {});

      return { success: false, message: 'No available delivery partners' };
    }

    // Priority Rules:
    // 1. Lowest Active Workload (orders count)
    // 2. Longest Idle Time (updatedAt)
    const sortedPartners = availablePartners.sort((a, b) => {
      const activeA = a.orders ? a.orders.length : 0;
      const activeB = b.orders ? b.orders.length : 0;
      if (activeA !== activeB) return activeA - activeB;
      return new Date(a.updatedAt) - new Date(b.updatedAt);
    });

    const chosenPartner = sortedPartners[0];

    await prisma.$transaction([
      prisma.deliveryPartner.update({
        where: { id: chosenPartner.id },
        data: { status: 'On Delivery' }
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId: chosenPartner.id,
          deliveryAssignedAt: new Date()
        }
      })
    ]);

    if (io) {
      io.to(`delivery:${chosenPartner.id}`).emit('delivery_assigned', {
        partnerId: chosenPartner.id,
        orderId: orderId,
        invoiceNumber: order.invoiceNumber,
        message: `⚡ Automatically assigned order ${order.invoiceNumber || orderId.slice(-6).toUpperCase()}`
      });
      io.emit('order_status_updated', {
        orderId,
        status: order.status,
        deliveryPartnerId: chosenPartner.id
      });
    }

    await prisma.notification.create({
      data: {
        deliveryPartnerId: chosenPartner.id,
        role: 'delivery',
        title: 'New Delivery Assigned',
        message: `⚡ Automatically assigned order ${order.invoiceNumber || orderId.slice(-6).toUpperCase()}`,
        type: 'order_assigned',
        link: '/delivery/orders'
      }
    }).catch(console.error);

    return {
      success: true,
      partner: chosenPartner,
      message: `Automatically assigned to ${chosenPartner.name}`
    };
  } catch (err) {
    console.error('[AUTO-ASSIGN ERROR]:', err);
    return { success: false, message: 'Server error during auto assignment' };
  }
};

export default router;

// ─── Delivery Partner Assignment Endpoints ─────────────────────────────────

router.post('/orders/:id/assign-delivery', async (req, res) => {
  try {
    const { deliveryPartnerId } = req.body;
    if (!deliveryPartnerId) {
      return res.status(400).json({ message: 'deliveryPartnerId is required' });
    }

    const orderRaw = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!orderRaw) return res.status(404).json({ message: 'Order not found' });

    const assignableStatuses = ['Accepted', 'Order Confirmed', 'Packing', 'Packed'];
    if (!assignableStatuses.includes(orderRaw.status)) {
      return res.status(400).json({ message: `Order must be Accepted or Packed before assigning a delivery partner. Current status: ${orderRaw.status}` });
    }

    if (orderRaw.deliveryPartnerId) {
      return res.status(400).json({ message: 'Order already has a delivery partner assigned' });
    }

    const partner = await prisma.deliveryPartner.findUnique({ where: { id: deliveryPartnerId } });
    if (!partner || partner.status !== 'Available') {
      return res.status(400).json({ message: 'Selected delivery partner is not Available' });
    }

    // Update partner status and assign to order
    await prisma.$transaction([
      prisma.deliveryPartner.update({
        where: { id: deliveryPartnerId },
        data: { status: 'On Delivery' }
      }),
      prisma.order.update({
        where: { id: req.params.id },
        data: {
          deliveryPartnerId,
          deliveryAssignedAt: new Date()
        }
      })
    ]);

    const io = req.app?.get('io');
    if (io) {
      io.to(`delivery:${deliveryPartnerId}`).emit('delivery_assigned', {
        partnerId: deliveryPartnerId,
        orderId: req.params.id,
        invoiceNumber: orderRaw.invoiceNumber,
        message: `You have been assigned order ${orderRaw.invoiceNumber || req.params.id.slice(-6).toUpperCase()}`
      });
    }

    await prisma.notification.create({
      data: {
        deliveryPartnerId,
        role: 'delivery',
        title: 'New Delivery Assigned',
        message: `You have been assigned order ${orderRaw.invoiceNumber || req.params.id.slice(-6).toUpperCase()}`,
        type: 'order_assigned',
        link: '/delivery/orders'
      }
    }).catch(console.error);

    res.json({ success: true, message: 'Delivery partner assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/orders/:id/reassign-delivery', async (req, res) => {
  try {
    const { deliveryPartnerId } = req.body;
    if (!deliveryPartnerId) {
      return res.status(400).json({ message: 'deliveryPartnerId is required' });
    }

    const orderRaw = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!orderRaw) return res.status(404).json({ message: 'Order not found' });

    if (orderRaw.pickedUpAt) {
      return res.status(400).json({ message: 'Cannot reassign after the order is Picked Up' });
    }

    const newPartner = await prisma.deliveryPartner.findUnique({ where: { id: deliveryPartnerId } });
    if (!newPartner || newPartner.status !== 'Available') {
      return res.status(400).json({ message: 'Selected new delivery partner is not Available' });
    }

    const transactionTasks = [
      prisma.deliveryPartner.update({
        where: { id: deliveryPartnerId },
        data: { status: 'On Delivery' }
      }),
      prisma.order.update({
        where: { id: req.params.id },
        data: {
          deliveryPartnerId,
          deliveryAssignedAt: new Date(),
          deliveryAcceptedAt: null // reset tracking for new partner
        }
      })
    ];

    if (orderRaw.deliveryPartnerId) {
      transactionTasks.unshift(
        prisma.deliveryPartner.update({
          where: { id: orderRaw.deliveryPartnerId },
          data: { status: 'Available' }
        })
      );
    }

    await prisma.$transaction(transactionTasks);

    const io = req.app?.get('io');
    if (io) {
      io.to(`delivery:${deliveryPartnerId}`).emit('delivery_assigned', {
        partnerId: deliveryPartnerId,
        orderId: req.params.id,
        invoiceNumber: orderRaw.invoiceNumber,
        message: `You have been assigned order ${orderRaw.invoiceNumber || req.params.id.slice(-6).toUpperCase()}`
      });
    }

    await prisma.notification.create({
      data: {
        deliveryPartnerId,
        role: 'delivery',
        title: 'New Delivery Assigned',
        message: `You have been reassigned to order ${orderRaw.invoiceNumber || req.params.id.slice(-6).toUpperCase()}`,
        type: 'order_assigned',
        link: '/delivery/orders'
      }
    }).catch(console.error);

    res.json({ success: true, message: 'Delivery partner reassigned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/orders/:id/auto-assign', async (req, res) => {
  try {
    const io = req.app?.get('io');
    const result = await autoAssignDeliveryPartner(req.params.id, io);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error during auto assignment' });
  }
});
