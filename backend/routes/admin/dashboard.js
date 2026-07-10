import express from 'express';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat } from '../../utils/formatMongoCompat.js';

const router = express.Router();

router.get('/dashboard-stats', async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      totalOrders,
      totalCustomers,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      lowStockProducts,
      outOfStockProducts,
      newCustomersToday,
      cancelledOrdersToday,
      totalCancelledOrders,
      recentOrdersRaw,
      ordersLast7Raw
    ] = await Promise.all([
      prisma.product.count(),
      prisma.order.count({ where: { status: { not: 'Cancelled' } } }),
      prisma.user.count({ where: { isAdmin: false } }),
      prisma.order.count({ where: { status: { not: 'Cancelled' }, createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: 'Pending' } }),
      prisma.order.count({ where: { status: 'Delivered' } }),
      prisma.product.count({ where: { stock: { gt: 0, lte: 5 } } }),
      prisma.product.count({ where: { stock: 0 } }),
      prisma.user.count({ where: { isAdmin: false, createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: 'Cancelled', createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: 'Cancelled' } }),
      prisma.order.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, status: { not: 'Cancelled' } }
      })
    ]);

    // Manual revenue calculation since $sum over complex OR conditions is tricky in basic prisma count
    // but easier to compute manually or via simpler aggregation.
    // revenueMatchQuery:
    // status in [Accepted, Out for Delivery, Delivered] AND (paymentStatus='Paid' OR (paymentMethod='COD' AND status='Delivered'))
    const allValidOrders = await prisma.order.findMany({
      where: {
        status: { in: ['Accepted', 'Out for Delivery', 'Delivered'] },
        OR: [
          { paymentStatus: 'Paid' },
          { AND: [{ paymentMethod: 'COD' }, { status: 'Delivered' }] }
        ]
      },
      select: { totalPrice: true, createdAt: true }
    });

    let totalRevenue = 0;
    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let totalPaidDeliveredOrders = allValidOrders.length;

    allValidOrders.forEach(o => {
      totalRevenue += o.totalPrice;
      if (o.createdAt >= startOfToday) {
        todayRevenue += o.totalPrice;
      } else if (o.createdAt >= startOfYesterday && o.createdAt <= endOfYesterday) {
        yesterdayRevenue += o.totalPrice;
      }
    });

    let revenueGrowthPct = 0;
    if (yesterdayRevenue > 0) {
      revenueGrowthPct = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
    } else if (todayRevenue > 0) {
      revenueGrowthPct = 100;
    }

    const avgOrderValue = totalPaidDeliveredOrders > 0 ? Math.round((totalRevenue / totalPaidDeliveredOrders) * 100) / 100 : 0;

    // Top-selling products calculation (requires scanning order items)
    const validOrdersForItems = await prisma.order.findMany({
      where: { status: { not: 'Cancelled' } },
      include: { orderItems: true }
    });

    const productSalesMap = {};
    validOrdersForItems.forEach(order => {
      order.orderItems.forEach(item => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            _id: item.productId,
            name: item.name,
            image: item.image,
            sold: 0,
            revenue: 0
          };
        }
        productSalesMap[item.productId].sold += item.quantity;
        productSalesMap[item.productId].revenue += (item.price * item.quantity);
      });
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    const topSellingProduct = topProducts[0]?.name || 'N/A';

    // 7-day timeline for Sales and Revenue charts
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      last7Days.push({ date: dateStr, revenue: 0, sales: 0 });
    }

    ordersLast7Raw.forEach(o => {
      const oDate = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const dayBucket = last7Days.find(day => day.date === oDate);
      if (dayBucket) {
        const isPaidOrDelivered = o.paymentStatus === 'Paid' || (o.paymentMethod === 'COD' && o.status === 'Delivered');
        if (isPaidOrDelivered) {
          dayBucket.revenue += o.totalPrice;
        }
        dayBucket.sales += 1;
      }
    });

    // Format recent orders
    const recentOrders = recentOrdersRaw.map(o => ({
      _id: o.id,
      invoiceNumber: o.invoiceNumber || o.id.toString().slice(-8).toUpperCase(),
      totalPrice: o.totalPrice,
      status: o.status,
      createdAt: o.createdAt,
      user: o.user ? { fullName: o.user.fullName, phoneNumber: o.user.phoneNumber, email: o.user.email } : null
    }));

    res.json({
      stats: {
        totalProducts,
        totalOrders,
        totalRevenue,
        todayOrders,
        totalCustomers,
        pendingOrders,
        deliveredOrders,
        lowStockProducts,
        outOfStockProducts,
        todayRevenue,
        yesterdayRevenue,
        revenueGrowthPct,
        newCustomersToday,
        cancelledOrdersToday,
        totalCancelledOrders,
        avgOrderValue,
        topSellingProduct
      },
      chartData: last7Days,
      recentOrders,
      topProducts,
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
