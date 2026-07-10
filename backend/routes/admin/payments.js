import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';
import { createAndEmitNotification } from '../../utils/notificationHelper.js';

const router = express.Router();

const logAuditAndEmit = async (req, action, targetType, targetId, targetName, oldValue, newValue, eventName, eventData) => {
  try {
    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action,
        targetType,
        targetId: String(targetId || ''),
        targetName: String(targetName || ''),
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null
      }
    });
    const io = req.app.get('io');
    if (io && eventName) {
      io.emit(eventName, eventData);
    }
  } catch (err) {
    console.error('AuditLog helper error:', err);
  }
};

router.get('/payments', async (req, res) => {
  try {
    const { status, search } = req.query;
    let where = {};
    if (status && status !== 'All') {
      if (status === 'COD') where.paymentMethod = 'COD';
      else where.paymentStatus = status;
    }
    const ordersRaw = await prisma.order.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    
    let formatted = ordersRaw.map(o => ({
      _id: o.id,
      orderId: o.invoiceNumber || o.id.toString().slice(-8).toUpperCase(),
      customerName: o.user ? o.user.fullName : (o.recipient?.name || 'Guest'),
      phoneNumber: o.user ? o.user.phoneNumber : (o.recipient?.phone || 'N/A'),
      paymentMethod: o.paymentMethod || 'COD',
      amount: o.totalPrice,
      paymentStatus: o.paymentStatus || 'Pending',
      date: o.createdAt,
      updatedBy: 'System',
      auditLog: []
    }));

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      formatted = formatted.filter(p => 
        p.orderId.toLowerCase().includes(s) ||
        p.customerName.toLowerCase().includes(s) ||
        p.phoneNumber.includes(s)
      );
    }

    res.json(formatted);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/payments/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const orderRaw = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!orderRaw) return res.status(404).json({ message: 'Order payment not found' });

    const oldStatus = orderRaw.paymentStatus || 'Pending';
    
    const updatedRaw = await prisma.order.update({
      where: { id: req.params.id },
      data: { paymentStatus: status }
    });

    if (updatedRaw.userId) {
      try {
        const io = req.app.get('io');
        if (status === 'Paid') {
          await createAndEmitNotification(io, {
            userId: updatedRaw.userId,
            title: 'Payment Completed',
            message: `Your payment of Rs. ${updatedRaw.totalPrice} for order ${updatedRaw.invoiceNumber} has been marked as Paid.`,
            type: 'payment',
            role: 'customer',
            actionUrl: '/profile'
          });
        } else if (status === 'Refunded') {
          await createAndEmitNotification(io, {
            userId: updatedRaw.userId,
            title: 'Refund Processed',
            message: `A refund of Rs. ${updatedRaw.totalPrice} for order ${updatedRaw.invoiceNumber} has been successfully processed.`,
            type: 'payment',
            role: 'customer',
            actionUrl: '/profile'
          });
        }
      } catch (payNotifErr) {
        console.error('Failed to trigger payment update notification:', payNotifErr);
      }
    }

    await logAuditAndEmit(req, 'Update Payment Status', 'Payment', updatedRaw.id, `Order #${updatedRaw.invoiceNumber}`, oldStatus, status, 'payment_updated', { orderId: updatedRaw.id, paymentStatus: status, userId: updatedRaw.userId });
    const io = req.app.get('io');
    if (io) io.emit('payment_update', { orderId: updatedRaw.id, paymentStatus: status });

    res.json({ message: `Payment status updated to ${status}`, order: formatMongoCompat(updatedRaw) });
  } catch (err) {
    console.error('Update payment status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
