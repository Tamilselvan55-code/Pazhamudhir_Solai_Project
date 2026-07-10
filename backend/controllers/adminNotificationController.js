import prisma from '../utils/prismaClient.js';

// Helper to create and emit a notification
export const createNotification = async (io, payload) => {
  const notif = await prisma.adminNotification.create({
    data: {
      type: payload.type || 'system',
      message: payload.message || '',
      read: payload.isRead || payload.read || false
    }
  });
  if (io) io.emit('admin:notification:new', notif);
  return notif;
};

// GET /api/admin/notifications
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead, search } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (isRead !== undefined) where.read = isRead === 'true';
    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    const notifications = await prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });
    
    const total = await prisma.adminNotification.count({ where });
    
    res.json({
      notifications,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching admin notifications',
      error: err.message || String(err)
    });
  }
};

// PATCH /api/admin/notifications/read/:id
export const markAsRead = async (req, res) => {
  try {
    const id = req.params.id;
    const notif = await prisma.adminNotification.update({
      where: { id },
      data: { read: true }
    });
    const io = req.app.get('io');
    if (io) io.emit('admin:notification:unreadCount');
    res.json(notif);
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error marking notification as read',
      error: err.message || String(err)
    });
  }
};

// PATCH /api/admin/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await prisma.adminNotification.updateMany({
      where: { read: false },
      data: { read: true }
    });
    const io = req.app.get('io');
    if (io) io.emit('admin:notification:unreadCount');
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error marking all notifications as read',
      error: err.message || String(err)
    });
  }
};

// DELETE /api/admin/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.adminNotification.delete({ where: { id } });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error deleting notification',
      error: err.message || String(err)
    });
  }
};

// DELETE /api/admin/notifications (clear all)
export const clearAll = async (req, res) => {
  try {
    await prisma.adminNotification.deleteMany({});
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    console.error('Clear all notifications error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error clearing notifications',
      error: err.message || String(err)
    });
  }
};
