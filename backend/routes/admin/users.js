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

router.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    let where = {};
    if (search && search.trim()) {
      where.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { phoneNumber: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }
    const usersRaw = await prisma.user.findMany({
      where,
      select: { id: true, fullName: true, phoneNumber: true, email: true, isBlocked: true, blockedReason: true, createdAt: true, isVerified: true },
      orderBy: { createdAt: 'desc' }
    });
    const users = formatMongoCompatArray(usersRaw);
    
    const usersWithOrders = await Promise.all(users.map(async (u) => {
      const count = await prisma.order.count({ where: { userId: u.id } });
      return { ...u, totalOrders: count };
    }));

    res.json(usersWithOrders);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/users/:id/block', async (req, res) => {
  try {
    const { isBlocked, reason } = req.body;
    const userRaw = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isBlocked: isBlocked === true || isBlocked === 'true',
        blockedAt: (isBlocked === true || isBlocked === 'true') ? new Date() : null,
        blockedReason: (isBlocked === true || isBlocked === 'true') ? reason : ''
      }
    });
    const user = formatMongoCompat(userRaw);
    delete user.password;

    res.json({ message: `User account has been ${isBlocked ? 'blocked' : 'unblocked'}.`, user });
  } catch (error) {
    console.error('Block/unblock user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/:id/orders', async (req, res) => {
  try {
    const ordersRaw = await prisma.order.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(formatMongoCompatArray(ordersRaw));
  } catch (error) {
    console.error('Fetch user orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const userRaw = await prisma.user.findUnique({ where: { id: userId } });
    if (!userRaw) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (userRaw.isAdmin || userRaw.role === 'SuperAdmin' || userRaw.role === 'Admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted through this endpoint.' });
    }

    const deletedUserInfo = {
      fullName:    userRaw.fullName,
      phoneNumber: userRaw.phoneNumber,
      email:       userRaw.email,
    };

    await prisma.user.delete({ where: { id: userId } });

    await prisma.pendingUser.deleteMany({
      where: { OR: [{ email: userRaw.email }, { phoneNumber: userRaw.phoneNumber }] }
    });

    await prisma.passwordReset.deleteMany({ where: { email: userRaw.email } });

    await prisma.notification.deleteMany({ where: { userId: userId } });

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action:     'Deleted User',
        targetType: 'User',
        targetId:   String(userId),
        targetName: deletedUserInfo.fullName,
        oldValue: JSON.stringify(deletedUserInfo),
        newValue: null,
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('user_deleted', { userId, ...deletedUserInfo });
      io.emit('dashboard_stats_update', {});
    }

    res.json({
      success: true,
      message: `User account for "${deletedUserInfo.fullName}" has been permanently deleted.`,
      deletedUser: deletedUserInfo,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error while deleting user.' });
  }
});

export default router;
