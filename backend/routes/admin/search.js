import express from 'express';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const trimmed = query.trim();
    if (!trimmed) {
      return res.json({ products: [], orders: [], users: [], categories: [], offers: [] });
    }

    const [productsRaw, ordersRaw, usersRaw, categoriesRaw, offersRaw] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { nameTamil: { contains: trimmed, mode: 'insensitive' } },
            { tamilName: { contains: trimmed, mode: 'insensitive' } },
            { englishName: { contains: trimmed, mode: 'insensitive' } },
            { description: { contains: trimmed, mode: 'insensitive' } },
            { category: { contains: trimmed, mode: 'insensitive' } },
            { sku: { contains: trimmed, mode: 'insensitive' } }
          ]
        },
        take: 5
      }),
      prisma.order.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: trimmed, mode: 'insensitive' } }
            // Recipient name/phone would require JSON querying or separate fields. Using invoiceNumber for quick search.
          ]
        },
        include: { user: true },
        take: 5
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: trimmed, mode: 'insensitive' } },
            { email: { contains: trimmed, mode: 'insensitive' } },
            { phoneNumber: { contains: trimmed, mode: 'insensitive' } }
          ]
        },
        take: 5
      }),
      prisma.category.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { tamilName: { contains: trimmed, mode: 'insensitive' } },
            { description: { contains: trimmed, mode: 'insensitive' } }
          ]
        },
        take: 5
      }),
      prisma.offer.findMany({
        where: {
          OR: [
            { title: { contains: trimmed, mode: 'insensitive' } },
            { description: { contains: trimmed, mode: 'insensitive' } },
            { promoCode: { contains: trimmed, mode: 'insensitive' } }
          ]
        },
        take: 5
      })
    ]);

    const mappedProducts = productsRaw.map(p => ({
      _id: p.id,
      productName: p.name,
      categoryName: p.category,
      image: p.image
    }));

    const mappedUsers = usersRaw.map(u => ({
      _id: u.id,
      name: u.fullName,
      email: u.email,
      phoneNumber: u.phoneNumber
    }));

    const mappedOrders = ordersRaw.map(o => ({
      _id: o.id,
      invoiceNumber: o.invoiceNumber || o.id.toString().slice(-8).toUpperCase()
    }));

    const mappedCategories = categoriesRaw.map(c => ({
      _id: c.id,
      categoryName: c.name
    }));

    const mappedOffers = offersRaw.map(f => ({
      _id: f.id,
      offerTitle: f.title
    }));

    res.json({
      products: mappedProducts,
      orders: mappedOrders,
      users: mappedUsers,
      categories: mappedCategories,
      offers: mappedOffers
    });
  } catch (error) {
    console.error('Quick Search Error:', error);
    res.json({ products: [], orders: [], users: [], categories: [], offers: [] });
  }
});

export default router;
