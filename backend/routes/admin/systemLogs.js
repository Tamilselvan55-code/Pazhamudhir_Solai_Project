import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompatArray } from '../../utils/formatMongoCompat.js';

const router = express.Router();

router.get('/system-logs', async (req, res) => {
  try {
    const { type, search, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let where = {};
    
    // Type Filter
    if (type && type !== 'all') {
      if (type === 'admin-login') {
        where.action = 'Admin Login';
      } else if (type === 'customer-login') {
        where.action = 'Customer Login';
      } else if (type === 'order') {
        where.targetType = 'Order';
      } else if (type === 'product') {
        where.targetType = { in: ['Product', 'Price', 'Stock'] };
      } else if (type === 'category') {
        where.targetType = 'Category';
      } else if (type === 'error') {
        where.action = { contains: 'Error', mode: 'insensitive' };
      }
    }

    // Keyword Search
    if (search && search.trim() !== '') {
      where.OR = [
        { adminName: { contains: search.trim(), mode: 'insensitive' } },
        { action: { contains: search.trim(), mode: 'insensitive' } },
        { targetName: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const logsRaw = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await prisma.auditLog.count({ where });

    res.json({
      logs: formatMongoCompatArray(logsRaw),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
