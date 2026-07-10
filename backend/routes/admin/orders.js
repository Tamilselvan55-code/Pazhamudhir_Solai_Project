import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';
import { createAndEmitNotification } from '../../utils/notificationHelper.js';

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
      include: { user: { select: { fullName: true, phoneNumber: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    res.json({
      orders: formatMongoCompatArray(ordersRaw),
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
      include: { user: { select: { fullName: true, phoneNumber: true, email: true } }, orderItems: true }
    });
    if (!orderRaw) return res.status(404).json({ message: 'Order not found' });
    res.json(formatMongoCompat(orderRaw));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const orderRaw = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { orderItems: true, user: true }
    });
    if (!orderRaw) return res.status(404).json({ success: false, message: 'Order not found' });

    const allowedTransitions = {
      Pending: ["Accepted", "Cancelled"],
      Accepted: ["Out for Delivery"],
      "Out for Delivery": ["Delivered"],
      Delivered: [],
      Cancelled: []
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
      updateData.paymentStatus = 'Paid';
    }

    const updatedOrderRaw = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
      include: { user: true, orderItems: true }
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

    res.json({ success: true, message: `Order status updated to ${status}.`, order: formatMongoCompat(updatedOrderRaw) });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
