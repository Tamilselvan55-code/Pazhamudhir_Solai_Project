import express from 'express';
import Notification from '../models/Notification.js';
import NotificationSettings from '../models/NotificationSettings.js';
import { protect } from '../middleware/auth.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// ─── GET /api/notifications ──────────────────────────────────────────────────
router.get('/notifications', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      page = 1, 
      limit = 10, 
      type = 'all', 
      status = 'all', 
      search = '', 
      sort = 'newest' 
    } = req.query;

    const query = { userId, role: 'customer' };

    // Search filter
    if (search.trim()) {
      query.$or = [
        { title: new RegExp(search.trim(), 'i') },
        { message: new RegExp(search.trim(), 'i') }
      ];
    }

    // Type filter
    if (type !== 'all') {
      if (type === 'orders') {
        query.type = 'order';
      } else if (type === 'offers') {
        query.type = { $in: ['offer', 'wishlist', 'cart', 'promotional'] };
      } else if (type === 'delivery') {
        query.type = 'delivery';
      } else if (type === 'account') {
        query.type = 'account';
      } else if (type === 'security') {
        query.type = 'security';
      } else if (type === 'system') {
        query.type = 'system';
      } else {
        query.type = type;
      }
    }

    // Status filter
    if (status !== 'all') {
      query.isRead = status === 'read';
    }

    // Sorting logic
    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'unread') {
      sortOption = { isRead: 1, createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query)
    ]);

    const unreadCount = await Notification.countDocuments({ userId, role: 'customer', isRead: false });

    res.json({
      success: true,
      notifications,
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

// ─── GET /api/notifications/unread-count ──────────────────────────────────────
router.get('/notifications/unread-count', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await Notification.countDocuments({ userId, role: 'customer', isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── POST /api/notifications ─────────────────────────────────────────────────
router.post('/notifications', protect, async (req, res) => {
  try {
    const userId = req.user._id;
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

    res.status(201).json({ success: true, notification: notif });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch('/notifications/:id/read', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId, role: 'customer' },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Emit real-time unreadCount update
    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId.toString()}`;
      const unreadCount = await Notification.countDocuments({ userId, role: 'customer', isRead: false });
      io.to(roomName).emit('customer:notification:unreadCount', { count: unreadCount });
    }

    res.json({ success: true, notification: notif });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
router.patch('/notifications/read-all', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany(
      { userId, role: 'customer', isRead: false },
      { $set: { isRead: true } }
    );

    // Emit real-time unreadCount update
    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId.toString()}`;
      io.to(roomName).emit('customer:notification:unreadCount', { count: 0 });
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────
router.delete('/notifications/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId, role: 'customer' });

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Emit real-time unreadCount update
    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId.toString()}`;
      const unreadCount = await Notification.countDocuments({ userId, role: 'customer', isRead: false });
      io.to(roomName).emit('customer:notification:unreadCount', { count: unreadCount });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── DELETE /api/notifications/clear-all ─────────────────────────────────────
router.delete('/notifications/clear-all', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.deleteMany({ userId, role: 'customer' });

    // Emit real-time unreadCount update
    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId.toString()}`;
      io.to(roomName).emit('customer:notification:unreadCount', { count: 0 });
    }

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── GET /api/notification-settings ──────────────────────────────────────────
router.get('/notification-settings', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    let settings = await NotificationSettings.findOne({ userId });
    if (!settings) {
      settings = await NotificationSettings.create({ userId });
    }
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── PUT /api/notification-settings ──────────────────────────────────────────
router.put('/notification-settings', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      orderNotifications, 
      offerNotifications, 
      deliveryNotifications, 
      securityNotifications, 
      promotionalNotifications, 
      generalNotifications 
    } = req.body;

    let settings = await NotificationSettings.findOneAndUpdate(
      { userId },
      { 
        $set: {
          orderNotifications, 
          offerNotifications, 
          deliveryNotifications, 
          securityNotifications, 
          promotionalNotifications, 
          generalNotifications 
        } 
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
