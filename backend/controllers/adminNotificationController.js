import Notification from '../models/Notification.js';

// Helper to create and emit a notification
export const createNotification = async (io, payload) => {
  const notif = new Notification(payload);
  await notif.save();
  if (io) io.emit('admin:notification:new', notif);
  return notif;
};

// GET /api/admin/notifications
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ title: { $regex: regex } }, { message: { $regex: regex } }];
    }
    const notifications = await Notification.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Notification.countDocuments(filter);
    res.json({ notifications, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/admin/notifications/read/:id
export const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    const io = req.app.get('io');
    if (io) io.emit('admin:notification:unreadCount');
    res.json(notif);
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/admin/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    const io = req.app.get('io');
    if (io) io.emit('admin:notification:unreadCount');
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndDelete(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/notifications (clear all)
export const clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({});
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    console.error('Clear all notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
