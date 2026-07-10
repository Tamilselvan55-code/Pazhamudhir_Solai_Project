import express from 'express';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';
import { protect } from '../middleware/auth.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';

const router = express.Router();

router.get('/notifications', protect, async (req, res) => {
  try {
    const userId = (req.user._id || req.user.id).toString();
    const { 
      page = 1, 
      limit = 10, 
      type = 'all', 
      status = 'all', 
      search = '', 
      sort = 'newest' 
    } = req.query;

    const where = { userId, role: 'customer' };

    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { message: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    if (type !== 'all') {
      if (type === 'orders') {
        where.type = 'order';
      } else if (type === 'offers') {
        where.type = { in: ['offer', 'wishlist', 'cart', 'promotional'] };
      } else if (type === 'delivery') {
        where.type = 'delivery';
      } else if (type === 'account') {
        where.type = 'account';
      } else if (type === 'security') {
        where.type = 'security';
      } else if (type === 'system') {
        where.type = 'system';
      } else {
        where.type = type;
      }
    }

    if (status !== 'all') {
      where.isRead = status === 'read';
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'unread') {
      orderBy = [{ isRead: 'asc' }, { createdAt: 'desc' }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notificationsRaw, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit)
      }),
      prisma.notification.count({ where })
    ]);

    const unreadCount = await prisma.notification.count({ where: { userId, role: 'customer', isRead: false } });

    res.json({
      success: true,
      notifications: formatMongoCompat(notificationsRaw),
      total,
      unreadCount,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Fetch user notifications error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.get('/notifications/unread-count', protect, async (req, res) => {
  try {
    const userId = (req.user._id || req.user.id).toString();
    const count = await prisma.notification.count({ where: { userId, role: 'customer', isRead: false } });
    res.json({ success: true, count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.post('/notifications', protect, async (req, res) => {
  try {
    const userId = (req.user._id || req.user.id).toString();
    const { title, message, type, priority = 'normal', actionUrl = '' } = req.body;
    
    if (!title || !message || !type) {
      return res.status(400).json({ message: 'Title, message, and type are required.' });
    }

    const io = req.app.get('io');
    const notif = await createAndEmitNotification(io, {
      userId,
      title,
      message,
      type,
      role: 'customer',
      priority,
      actionUrl
    });

    res.status(201).json({ success: true, notification: formatMongoCompat(notif) });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.patch('/notifications/:id/read', protect, async (req, res) => {
  try {
    const userId = (req.user._id || req.user.id).toString();
    const notifId = req.params.id;

    const existing = await prisma.notification.findFirst({ where: { id: notifId, userId, role: 'customer' } });
    if (!existing) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notifRaw = await prisma.notification.update({
      where: { id: notifId },
      data: { isRead: true }
    });

    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId}`;
      const unreadCount = await prisma.notification.count({ where: { userId, role: 'customer', isRead: false } });
      io.to(roomName).emit('customer:notification:unreadCount', { count: unreadCount });
    }

    res.json({ success: true, notification: formatMongoCompat(notifRaw) });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.patch('/notifications/read-all', protect, async (req, res) => {
  try {
    const userId = (req.user._id || req.user.id).toString();
    await prisma.notification.updateMany({
      where: { userId, role: 'customer', isRead: false },
      data: { isRead: true }
    });

    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId}`;
      io.to(roomName).emit('customer:notification:unreadCount', { count: 0 });
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.delete('/notifications/:id', protect, async (req, res) => {
  try {
    const userId = (req.user._id || req.user.id).toString();
    const notifId = req.params.id;

    const existing = await prisma.notification.findFirst({ where: { id: notifId, userId, role: 'customer' } });
    if (!existing) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await prisma.notification.delete({ where: { id: notifId } });

    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId}`;
      const unreadCount = await prisma.notification.count({ where: { userId, role: 'customer', isRead: false } });
      io.to(roomName).emit('customer:notification:unreadCount', { count: unreadCount });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.delete('/notifications/clear-all', protect, async (req, res) => {
  try {
    const userId = (req.user._id || req.user.id).toString();
    await prisma.notification.deleteMany({ where: { userId, role: 'customer' } });

    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId}`;
      io.to(roomName).emit('customer:notification:unreadCount', { count: 0 });
    }

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.get('/notification-settings', protect, async (req, res) => {
  try {
    const userId = (req.user._id || req.user.id).toString();
    let settingsRaw = await prisma.notificationSettings.findUnique({ where: { userId } });
    if (!settingsRaw) {
      settingsRaw = await prisma.notificationSettings.create({ data: { userId } });
    }
    res.json({ success: true, settings: formatMongoCompat(settingsRaw) });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.put('/notification-settings', protect, async (req, res) => {
  try {
    const userId = (req.user._id || req.user.id).toString();
    const { 
      orderNotifications, 
      offerNotifications, 
      deliveryNotifications, 
      securityNotifications, 
      promotionalNotifications, 
      generalNotifications 
    } = req.body;

    const dataToUpdate = {};
    if (orderNotifications !== undefined) dataToUpdate.orderNotifications = orderNotifications;
    if (offerNotifications !== undefined) dataToUpdate.offerNotifications = offerNotifications;
    if (deliveryNotifications !== undefined) dataToUpdate.deliveryNotifications = deliveryNotifications;
    if (securityNotifications !== undefined) dataToUpdate.securityNotifications = securityNotifications;
    if (promotionalNotifications !== undefined) dataToUpdate.promotionalNotifications = promotionalNotifications;
    if (generalNotifications !== undefined) dataToUpdate.generalNotifications = generalNotifications;

    const settingsRaw = await prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId, ...dataToUpdate },
      update: dataToUpdate
    });

    res.json({ success: true, settings: formatMongoCompat(settingsRaw) });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
