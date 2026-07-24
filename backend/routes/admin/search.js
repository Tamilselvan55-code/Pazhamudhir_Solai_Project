import express from 'express';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompatArray } from '../../utils/formatMongoCompat.js';

const router = express.Router();

const isUuid = (str) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const trimmed = query.trim();

    if (!trimmed) {
      return res.json({
        products: [],
        orders: [],
        users: [],
        categories: [],
        offers: [],
        notifications: []
      });
    }

    const uuidMatch = isUuid(trimmed) ? trimmed : null;

    // 1. Products Query
    const productOr = [
      { name: { contains: trimmed, mode: 'insensitive' } },
      { nameTamil: { contains: trimmed, mode: 'insensitive' } },
      { tamilName: { contains: trimmed, mode: 'insensitive' } },
      { englishName: { contains: trimmed, mode: 'insensitive' } },
      { description: { contains: trimmed, mode: 'insensitive' } },
      { categorySlug: { contains: trimmed, mode: 'insensitive' } },
      { sku: { contains: trimmed, mode: 'insensitive' } }
    ];
    if (uuidMatch) productOr.push({ id: uuidMatch });

    // 2. Orders Query
    const orderOr = [
      { invoiceNumber: { contains: trimmed, mode: 'insensitive' } },
      { user: { fullName: { contains: trimmed, mode: 'insensitive' } } },
      { user: { phoneNumber: { contains: trimmed, mode: 'insensitive' } } },
      { user: { email: { contains: trimmed, mode: 'insensitive' } } }
    ];
    if (uuidMatch) orderOr.push({ id: uuidMatch });

    // 3. Customers / Users Query
    const userOr = [
      { fullName: { contains: trimmed, mode: 'insensitive' } },
      { email: { contains: trimmed, mode: 'insensitive' } },
      { phoneNumber: { contains: trimmed, mode: 'insensitive' } }
    ];
    if (uuidMatch) userOr.push({ id: uuidMatch });

    // 4. Categories Query
    const categoryOr = [
      { name: { contains: trimmed, mode: 'insensitive' } },
      { tamilName: { contains: trimmed, mode: 'insensitive' } },
      { description: { contains: trimmed, mode: 'insensitive' } }
    ];
    if (uuidMatch) categoryOr.push({ id: uuidMatch });

    // 5. Offers Query
    const offerOr = [
      { title: { contains: trimmed, mode: 'insensitive' } },
      { description: { contains: trimmed, mode: 'insensitive' } },
      { couponCode: { contains: trimmed, mode: 'insensitive' } }
    ];
    if (uuidMatch) offerOr.push({ id: uuidMatch });

    // 6. Admin Notifications Query
    const notifOr = [
      { title: { contains: trimmed, mode: 'insensitive' } },
      { message: { contains: trimmed, mode: 'insensitive' } }
    ];
    if (uuidMatch) notifOr.push({ id: uuidMatch });

    const [productsRaw, ordersRaw, usersRaw, categoriesRaw, offersRaw, notifsRaw] =
      await Promise.all([
        prisma.product.findMany({
          where: { OR: productOr },
          take: 5
        }),
        prisma.order.findMany({
          where: { OR: orderOr },
          include: { user: { select: { fullName: true, phoneNumber: true, email: true } } },
          take: 5
        }),
        prisma.user.findMany({
          where: { OR: userOr },
          select: { id: true, fullName: true, phoneNumber: true, email: true },
          take: 10
        }),
        prisma.category.findMany({
          where: { OR: categoryOr },
          take: 10
        }),
        prisma.offer.findMany({
          where: { OR: offerOr },
          take: 10
        }),
        prisma.notification.findMany({
          where: { OR: notifOr },
          take: 10
        })
      ]);

    res.json({
      products: formatMongoCompatArray(productsRaw),
      orders: formatMongoCompatArray(ordersRaw),
      users: formatMongoCompatArray(usersRaw),
      categories: formatMongoCompatArray(categoriesRaw),
      offers: formatMongoCompatArray(offersRaw),
      notifications: formatMongoCompatArray(notifsRaw)
    });
  } catch (error) {
    console.error('Quick Search Error:', error);
    res.json({
      products: [],
      orders: [],
      users: [],
      categories: [],
      offers: [],
      notifications: []
    });
  }
});

export default router;
