import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompatArray } from '../../utils/formatMongoCompat.js';

const router = express.Router();

router.get('/reports', async (req, res) => {
  try {
    const [ordersRaw, productsRaw, usersRaw] = await Promise.all([
      prisma.order.findMany({ include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.product.findMany({ orderBy: { name: 'asc' } }),
      prisma.user.findMany({ where: { isAdmin: false }, orderBy: { createdAt: 'desc' } }),
    ]);

    const salesReport = ordersRaw.map(o => ({
      invoiceNumber: o.invoiceNumber || (o.id ? o.id.toString().slice(-8).toUpperCase() : 'N/A'),
      customer: o.user?.fullName || o.recipient?.name || 'Guest',
      itemsCount: (o.orderItems || []).reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0),
      totalPrice: Number(o.totalPrice) || 0,
      status: o.status || 'Pending',
      paymentStatus: o.paymentStatus || 'Pending',
      date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : 'N/A'
    }));

    const productReport = productsRaw.map(p => ({
      name: p.name || 'Unnamed',
      nameTamil: p.nameTamil || '',
      category: p.category || 'General',
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      isActive: p.isActive ? 'Active' : 'Inactive',
      offer: p.offerTag || 'None'
    }));

    const customerReport = usersRaw.map(u => ({
      fullName: u.fullName || 'Anonymous',
      email: u.email || 'N/A',
      phoneNumber: u.phoneNumber || 'N/A',
      isBlocked: u.isBlocked ? 'Blocked' : 'Active',
      registeredDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'N/A'
    }));

    res.json({ salesReport, productReport, customerReport });
  } catch (error) {
    console.error('Generate reports error:', error);
    res.status(500).json({ message: 'Server error generating reports', error: error.message, salesReport: [], productReport: [], customerReport: [] });
  }
});

// Since the dashboard analytics endpoint covers almost all complex aggregation, 
// the /reports/analytics uses similar simplified manual aggregations because SQLite/PostgreSQL differences in Prisma limit complex raw queries.

router.get('/reports/analytics', async (req, res) => {
  try {
    const { filter = 'Today', startDate, endDate, reportType = 'Sales Report' } = req.query;

    const now = new Date();
    const kNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

    let kStart = new Date(kNow);
    let kEnd = new Date(kNow);

    if (filter === 'Today') {
      kStart.setUTCHours(0, 0, 0, 0);
      kEnd.setUTCHours(23, 59, 59, 999);
    } else if (filter === 'Yesterday') {
      kStart.setUTCDate(kStart.getUTCDate() - 1);
      kStart.setUTCHours(0, 0, 0, 0);
      kEnd.setUTCDate(kEnd.getUTCDate() - 1);
      kEnd.setUTCHours(23, 59, 59, 999);
    } else if (filter === 'This Week') {
      const day = kNow.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      kStart.setUTCDate(kNow.getUTCDate() - diff);
      kStart.setUTCHours(0, 0, 0, 0);
      kEnd.setUTCDate(kStart.getUTCDate() + 6);
      kEnd.setUTCHours(23, 59, 59, 999);
    } else if (filter === 'Last Week') {
      const day = kNow.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      kStart.setUTCDate(kNow.getUTCDate() - diff - 7);
      kStart.setUTCHours(0, 0, 0, 0);
      kEnd.setUTCDate(kStart.getUTCDate() + 6);
      kEnd.setUTCHours(23, 59, 59, 999);
    } else if (filter === 'This Month') {
      kStart.setUTCDate(1);
      kStart.setUTCHours(0, 0, 0, 0);
      kEnd.setUTCMonth(kStart.getUTCMonth() + 1);
      kEnd.setUTCDate(0);
      kEnd.setUTCHours(23, 59, 59, 999);
    } else if (filter === 'Last Month') {
      kStart.setUTCMonth(kStart.getUTCMonth() - 1);
      kStart.setUTCDate(1);
      kStart.setUTCHours(0, 0, 0, 0);
      kEnd.setUTCMonth(kStart.getUTCMonth() + 1);
      kEnd.setUTCDate(0);
      kEnd.setUTCHours(23, 59, 59, 999);
    } else if (filter === 'This Year') {
      kStart.setUTCMonth(0);
      kStart.setUTCDate(1);
      kStart.setUTCHours(0, 0, 0, 0);
      kEnd.setUTCMonth(11);
      kEnd.setUTCDate(31);
      kEnd.setUTCHours(23, 59, 59, 999);
    } else if (filter === 'Custom Date Range' || filter === 'Custom Range') {
      if (startDate && endDate) {
        const parseCustomDate = (dateStr, isEnd) => {
          const parts = dateStr.split('-');
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          return new Date(Date.UTC(y, m, d, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0) - (5.5 * 60 * 60 * 1000));
        };
        kStart = parseCustomDate(startDate, false);
        kEnd = parseCustomDate(endDate, true);
      }
    }

    const filterStart = (filter === 'Custom Date Range' || filter === 'Custom Range') ? kStart : new Date(kStart.getTime() - (5.5 * 60 * 60 * 1000));
    const filterEnd   = (filter === 'Custom Date Range' || filter === 'Custom Range') ? kEnd : new Date(kEnd.getTime() - (5.5 * 60 * 60 * 1000));

    // Fetch all orders matching criteria and compute analytics in memory to avoid Prisma queryRaw complexities across engines
    const ordersRaw = await prisma.order.findMany({
      where: {
        createdAt: { gte: filterStart, lte: filterEnd }
      },
      include: { user: true, orderItems: true }
    });

    let totalRevenue = 0;
    let validOrderCount = 0;
    let pendingPaymentsCount = 0;
    const statusMap = { Pending: 0, Accepted: 0, 'Out for Delivery': 0, Delivered: 0, Cancelled: 0 };
    const paymentMap = { codTotal: 0, codPending: 0, codDelivered: 0, codCancelled: 0, codRevenue: 0 };
    const customerSpends = {};
    const productSales = {};
    const categorySales = {};
    
    ordersRaw.forEach(o => {
      // Status breakdown
      if (statusMap[o.status] !== undefined) statusMap[o.status]++;

      // Pending payments
      if (o.paymentStatus === 'Pending' && o.status !== 'Cancelled') pendingPaymentsCount++;

      // Revenue validation
      const isPaidOrDelivered = o.paymentStatus === 'Paid' || (o.paymentMethod === 'COD' && o.status === 'Delivered');
      const isAcceptedOrOutOrDelivered = ['Accepted', 'Out for Delivery', 'Delivered'].includes(o.status);
      
      if (isAcceptedOrOutOrDelivered && isPaidOrDelivered) {
        totalRevenue += o.totalPrice;
        validOrderCount++;
      }

      // Customer Spends
      if (o.status !== 'Cancelled') {
        if (o.userId) {
          if (!customerSpends[o.userId]) customerSpends[o.userId] = { name: o.user?.fullName || 'Guest', totalSpent: 0, orders: 0 };
          customerSpends[o.userId].totalSpent += o.totalPrice;
          customerSpends[o.userId].orders++;
        }
        
        // Products and categories
        o.orderItems.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { name: item.name, category: 'General', sold: 0, revenue: 0, image: item.image };
          }
          productSales[item.productId].sold += item.quantity;
          productSales[item.productId].revenue += (item.price * item.quantity);
        });
      }

      // COD analytics
      if (o.paymentMethod === 'COD') {
        paymentMap.codTotal++;
        if (o.status === 'Pending') paymentMap.codPending++;
        else if (o.status === 'Delivered') {
          paymentMap.codDelivered++;
          paymentMap.codRevenue += o.totalPrice;
        } else if (o.status === 'Cancelled') paymentMap.codCancelled++;
      }
    });

    const activeProducts = await prisma.product.findMany({ where: { isActive: true } });
    activeProducts.forEach(p => {
      if (productSales[p.id]) productSales[p.id].category = p.category;
    });

    Object.values(productSales).forEach(p => {
      if (!categorySales[p.category]) categorySales[p.category] = { category: p.category, sold: 0, revenue: 0 };
      categorySales[p.category].sold += p.sold;
      categorySales[p.category].revenue += p.revenue;
    });

    const topSellingProducts = Object.values(productSales).sort((a,b) => b.sold - a.sold).slice(0, 10);
    const categoryPerformance = Object.values(categorySales).sort((a,b) => b.revenue - a.revenue);

    const lowStock = activeProducts.filter(p => p.stock > 0 && p.stock <= 5).map(p => ({ name: p.name, tamilName: p.nameTamil || '', category: p.category || '', stock: p.stock, unit: p.unit || '', status: p.stock <= 2 ? 'Critical' : 'Low' }));
    const outOfStock = activeProducts.filter(p => p.stock === 0).map(p => ({ name: p.name, tamilName: p.nameTamil || '', category: p.category || '', unit: p.unit || '' }));

    const totalCustomers = await prisma.user.count({ where: { isAdmin: false } });
    const totalProducts = activeProducts.length;
    const avgOrderValue = validOrderCount > 0 ? totalRevenue / validOrderCount : 0;

    const recentOrdersFmt = ordersRaw.slice(0, 10).map(o => ({
      invoiceNumber: o.invoiceNumber || o.id.slice(-8).toUpperCase(),
      customer: o.user?.fullName || o.recipient?.name || 'Guest',
      phone: o.user?.phoneNumber || o.recipient?.phone || 'N/A',
      amount: o.totalPrice,
      paymentMethod: o.paymentMethod || 'COD',
      paymentStatus: o.paymentStatus || 'Pending',
      status: o.status || 'Pending',
      date: o.createdAt.toLocaleDateString('en-IN')
    }));

    let tableData = [];
    if (reportType === 'Sales Report' || reportType === 'Revenue Report') {
      const qualified = ordersRaw.filter(o => o.paymentStatus === 'Paid' || (o.paymentMethod === 'COD' && o.status === 'Delivered'));
      tableData = qualified.map(o => ({
        'Invoice': o.invoiceNumber || o.id.slice(-8).toUpperCase(),
        'Date': o.createdAt.toLocaleDateString('en-IN'),
        'Customer': o.user?.fullName || o.recipient?.name || 'Guest',
        'Items': o.orderItems.reduce((a, c) => a + (Number(c.quantity) || 1), 0),
        'Payment': o.paymentMethod || 'COD',
        'Amount': o.totalPrice,
        'Order Status': o.status,
        'Payment Status': o.paymentStatus
      }));
    } else if (reportType === 'Inventory Report') {
      tableData = activeProducts.map(p => ({
        'Product Name': p.name,
        'Category': p.category,
        'Price': p.price,
        'Stock': p.stock,
        'Status': p.stock === 0 ? 'Out of Stock' : p.stock <= 5 ? 'Low Stock' : 'In Stock'
      }));
    }

    res.json({
      summary: { totalRevenue, totalOrders: ordersRaw.length, totalCustomers, totalProducts, monthlyRevenue: 0, pendingPayments: pendingPaymentsCount, avgOrderValue },
      orderStatusCounts: statusMap,
      customerAnalytics: { total: totalCustomers, newToday: 0, newThisMonth: 0, returning: 0 },
      paymentAnalytics: paymentMap,
      charts: { dailySales: [], monthlySales: [], topSellingProducts, categoryPerformance, lowStock, outOfStock, recentOrders: recentOrdersFmt },
      tableData,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching report analytics' });
  }
});

export default router;
