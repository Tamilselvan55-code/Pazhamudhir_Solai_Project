import Notification from '../models/Notification.js';
import NotificationSettings from '../models/NotificationSettings.js';

// Auto-determine icon based on type
const getIconForType = (type) => {
  switch (type) {
    case 'order':
      return 'package';
    case 'delivery':
      return 'truck';
    case 'offer':
      return 'gift';
    case 'wishlist':
      return 'heart';
    case 'cart':
      return 'shopping-cart';
    case 'payment':
      return 'credit-card';
    case 'security':
      return 'shield';
    case 'account':
      return 'user';
    case 'general':
    case 'system':
    default:
      return 'bell';
  }
};

/**
 * Creates, saves, and broadcasts a notification via Socket.IO.
 */
export const createAndEmitNotification = async (io, {
  userId = null,
  title,
  message,
  type,
  role = 'customer',
  link = '',
  icon = '',
  priority = 'normal',
  actionUrl = '',
  customerName = '',
  phone = '',
  orderId = null,
  invoiceNumber = '',
  orderTotal = 0,
  totalItems = 0,
  paymentMethod = '',
  orderStatus = ''
}) => {
  try {
    // Resolve actionUrl and link compatibility
    const resolvedActionUrl = actionUrl || link || '';
    const resolvedLink = link || actionUrl || '';
    const resolvedIcon = icon || getIconForType(type) || 'bell';

    // Verify preferences if user-scoped customer notification
    if (role === 'customer' && userId) {
      let settings = await NotificationSettings.findOne({ userId });
      if (!settings) {
        settings = await NotificationSettings.create({ userId });
      }

      let isEnabled = true;
      if (type === 'order') {
        isEnabled = settings.orderNotifications;
      } else if (type === 'delivery') {
        isEnabled = settings.deliveryNotifications;
      } else if (type === 'offer' || type === 'wishlist' || type === 'cart' || type === 'promotional') {
        isEnabled = settings.offerNotifications && settings.promotionalNotifications;
      } else if (type === 'security' || type === 'account') {
        isEnabled = settings.securityNotifications;
      } else if (type === 'general' || type === 'system') {
        isEnabled = settings.generalNotifications;
      }

      if (!isEnabled) {
        console.log(`[Notification Helper] Notification skipped because type "${type}" is disabled in user ${userId} settings.`);
        return null;
      }
    }

    const notif = new Notification({
      userId,
      title,
      message,
      type,
      role,
      link: resolvedLink,
      isRead: false,
      icon: resolvedIcon,
      priority,
      actionUrl: resolvedActionUrl,
      customerName,
      phone,
      orderId,
      invoiceNumber,
      orderTotal,
      totalItems,
      paymentMethod,
      orderStatus
    });

    await notif.save();

    if (io) {
      if (role === 'admin') {
        // Broadcast to admins
        io.to('admin').emit('admin_notification', notif);
        io.emit('admin_notification', notif);

        // Emit unread count update trigger
        const unreadCount = await Notification.countDocuments({ role: 'admin', isRead: false });
        io.to('admin').emit('admin:notification:unreadCount', { count: unreadCount });
        io.emit('admin:notification:unreadCount', { count: unreadCount });
      } else if (role === 'customer' && userId) {
        // Send to specific customer's room
        const roomName = `user:${userId.toString()}`;
        io.to(roomName).emit('customer_notification', notif);

        const unreadCount = await Notification.countDocuments({ userId, role: 'customer', isRead: false });
        io.to(roomName).emit('customer:notification:unreadCount', { count: unreadCount });
      }
    }

    return notif;
  } catch (error) {
    console.error('[Notification Helper Error]:', error);
  }
};
