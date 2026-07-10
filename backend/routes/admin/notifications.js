import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';

const router = express.Router();

router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead, search } = req.query;
    const where = { role: 'admin' };
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } }
      ];
    }

    const notificationsRaw = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.notification.count({ where });
    const unreadCount = await prisma.notification.count({ where: { role: 'admin', isRead: false } });

    res.json({
      notifications: formatMongoCompatArray(notificationsRaw),
      unreadCount,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/notifications/mark-read', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { role: 'admin', isRead: false },
      data: { isRead: true }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('admin:notification:unreadCount', { count: 0 });
      io.emit('admin:notification:unreadCount', { count: 0 });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const notifRaw = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });

    const io = req.app.get('io');
    if (io) {
      const count = await prisma.notification.count({ where: { role: 'admin', isRead: false } });
      io.to('admin').emit('admin:notification:unreadCount', { count });
      io.emit('admin:notification:unreadCount', { count });
    }

    res.json({ success: true, notification: formatMongoCompat(notifRaw) });
  } catch (error) {
    console.error('Mark single notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/notifications/clear-all', async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where: { role: 'admin' } });

    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('admin:notification:unreadCount', { count: 0 });
      io.emit('admin:notification:unreadCount', { count: 0 });
    }

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/notifications/delete-read', async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where: { role: 'admin', isRead: true } });

    const io = req.app.get('io');
    if (io) {
      const count = await prisma.notification.count({ where: { role: 'admin', isRead: false } });
      io.to('admin').emit('admin:notification:unreadCount', { count });
      io.emit('admin:notification:unreadCount', { count });
    }

    res.json({ success: true, message: 'All read notifications deleted' });
  } catch (error) {
    console.error('Delete read notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/notifications/:id', async (req, res) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id } });

    const io = req.app.get('io');
    if (io) {
      const count = await prisma.notification.count({ where: { role: 'admin', isRead: false } });
      io.to('admin').emit('admin:notification:unreadCount', { count });
      io.emit('admin:notification:unreadCount', { count });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
