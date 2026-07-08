import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import PendingUser from '../models/PendingUser.js';
import PasswordReset from '../models/PasswordReset.js';
import AdminNotification from '../models/AdminNotification.js';
import Notification from '../models/Notification.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';
import StoreSettings from '../models/StoreSettings.js';
import Category from '../models/Category.js';
import { ensureDefaultCategories } from '../utils/seedDefaultCategories.js';
import Offer from '../models/Offer.js';
import AuditLog from '../models/AuditLog.js';
import CalendarEvent from '../models/CalendarEvent.js';
import { protectAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

const logAuditAndEmit = async (req, action, targetType, targetId, targetName, oldValue, newValue, eventName, eventData) => {
  try {
    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action,
      targetType,
      targetId: String(targetId || ''),
      targetName: String(targetName || ''),
      oldValue,
      newValue
    });
    const io = req.app.get('io');
    if (io && eventName) {
      io.emit(eventName, eventData);
    }
  } catch (err) {
    console.error('AuditLog helper error:', err);
  }
};

// Ensure uploads folder exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ─── GET /api/admin/search — Global Quick Search ─────────────────────────
router.get('/search', protectAdmin, async (req, res) => {
  try {
    const query = req.query.q || '';
    const trimmed = query.trim();
    if (!trimmed) {
      return res.json({ products: [], orders: [], users: [], categories: [], offers: [] });
    }

    const searchRegex = new RegExp(trimmed, 'i');

    const [products, orders, users, categories, offers] = await Promise.all([
      Product.find({
        $or: [
          { name: searchRegex },
          { nameTamil: searchRegex },
          { tamilName: searchRegex },
          { englishName: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { sku: searchRegex }
        ]
      }).limit(5).lean(),
      Order.find({
        $or: [
          { invoiceNumber: searchRegex },
          { 'recipient.name': searchRegex },
          { 'recipient.phone': searchRegex }
        ]
      }).populate('user', 'fullName phoneNumber').limit(5).lean(),
      User.find({
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          { phoneNumber: searchRegex }
        ]
      }).limit(5).lean(),
      Category.find({
        $or: [
          { name: searchRegex },
          { tamilName: searchRegex },
          { description: searchRegex }
        ]
      }).limit(5).lean(),
      Offer.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { promoCode: searchRegex }
        ]
      }).limit(5).lean()
    ]);

    const mappedProducts = products.map(p => ({
      _id: p._id,
      productName: p.name,
      categoryName: p.category,
      image: p.image
    }));

    const mappedUsers = users.map(u => ({
      _id: u._id,
      name: u.fullName,
      email: u.email,
      phoneNumber: u.phoneNumber
    }));

    const mappedOrders = orders.map(o => ({
      _id: o._id,
      invoiceNumber: o.invoiceNumber || o._id.toString().slice(-8).toUpperCase()
    }));

    const mappedCategories = categories.map(c => ({
      _id: c._id,
      categoryName: c.name
    }));

    const mappedOffers = offers.map(f => ({
      _id: f._id,
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

// ─── CALENDAR EVENTS APIS ───────────────────────────────────────────────
router.get('/calendar-events', protectAdmin, async (req, res) => {
  try {
    const events = await CalendarEvent.find({}).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Fetch calendar events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/calendar-events', protectAdmin, async (req, res) => {
  try {
    const { title, eventType, date, description } = req.body;
    if (!title || !date) {
      return res.status(400).json({ message: 'Title and date are required' });
    }
    const newEvent = await CalendarEvent.create({
      title,
      eventType,
      date,
      description,
      createdBy: req.admin?.name || 'Admin'
    });

    await logAuditAndEmit(
      req,
      'create',
      'CalendarEvent',
      newEvent._id,
      title,
      null,
      JSON.stringify(newEvent),
      null,
      null
    );

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/calendar-events/:id', protectAdmin, async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    await event.deleteOne();

    await logAuditAndEmit(
      req,
      'delete',
      'CalendarEvent',
      event._id,
      event.title,
      JSON.stringify(event),
      null,
      null,
      null
    );

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/admin/upload — Upload multiple files ─────────────────────────
router.post('/upload', protectAdmin, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const urls = req.files.map(file => `http://localhost:5000/uploads/${file.filename}`);
    res.json({ urls });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Upload failed: ' + error.message });
  }
});

// ─── GET /api/admin/dashboard-stats — Blinkit-style stats + chart timeline ──────
router.get('/dashboard-stats', protectAdmin, async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);

    const revenueMatchQuery = {
      $and: [
        { status: { $in: ['Accepted', 'Out for Delivery', 'Delivered'] } },
        {
          $or: [
            { paymentStatus: 'Paid' },
            { $and: [ { paymentMethod: 'COD' }, { status: 'Delivered' } ] }
          ]
        }
      ]
    };

    // Run queries in parallel for high speed
    const [
      totalProducts,
      totalOrders,
      totalCustomers,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      lowStockProducts,
      outOfStockProducts,
      revAgg,
      todayRevAgg,
      yesterdayRevAgg,
      newCustomersToday,
      cancelledOrdersToday,
      totalCancelledOrders,
      recentOrders,
    ] = await Promise.all([
      Product.countDocuments({}),
      Order.countDocuments({ status: { $ne: 'Cancelled' } }),
      User.countDocuments({ isAdmin: false }),
      Order.countDocuments({ status: { $ne: 'Cancelled' }, createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ status: 'Pending' }),
      Order.countDocuments({ status: 'Delivered' }),
      Product.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
      Product.countDocuments({ stock: 0 }),
      Order.aggregate([
        { $match: revenueMatchQuery },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Order.aggregate([
        { $match: { ...revenueMatchQuery, createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Order.aggregate([
        { $match: { ...revenueMatchQuery, createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      User.countDocuments({ isAdmin: false, createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ status: 'Cancelled', createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ status: 'Cancelled' }),
      Order.find({})
        .populate('user', 'fullName phoneNumber email')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('invoiceNumber totalPrice status createdAt user')
    ]);

    const totalRevenue = revAgg[0]?.total || 0;
    const todayRevenue = todayRevAgg[0]?.total || 0;
    const yesterdayRevenue = yesterdayRevAgg[0]?.total || 0;

    let revenueGrowthPct = 0;
    if (yesterdayRevenue > 0) {
      revenueGrowthPct = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
    } else if (todayRevenue > 0) {
      revenueGrowthPct = 100;
    }

    const totalPaidDeliveredOrders = await Order.countDocuments(revenueMatchQuery);
    const avgOrderValue = totalPaidDeliveredOrders > 0 ? Math.round((totalRevenue / totalPaidDeliveredOrders) * 100) / 100 : 0;

    // Top-selling products
    const topProducts = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: '$orderItems.product',
          name: { $first: '$orderItems.name' },
          image: { $first: '$orderItems.image' },
          sold: { $sum: '$orderItems.quantity' },
          revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } }
        }
      },
      { $sort: { sold: -1 } },
      { $limit: 5 }
    ]);

    const topSellingProduct = topProducts[0]?.name || 'N/A';

    // 7-day timeline for Sales and Revenue charts (using revenueMatchQuery for accurate matching)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      last7Days.push({ date: dateStr, revenue: 0, sales: 0 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const ordersLast7 = await Order.find({
      createdAt: { $gte: sevenDaysAgo },
      status: { $ne: 'Cancelled' }
    });

    ordersLast7.forEach(o => {
      const oDate = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const dayBucket = last7Days.find(day => day.date === oDate);
      if (dayBucket) {
        // Only count to revenue if it meets paid/delivered criteria
        const isPaidOrDelivered = o.paymentStatus === 'Paid' || (o.paymentMethod === 'COD' && o.status === 'Delivered');
        if (isPaidOrDelivered) {
          dayBucket.revenue += o.totalPrice;
        }
        dayBucket.sales += 1;
      }
    });

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

// ─── GET /api/admin/products — Filter, search, and sort products list ─────────
router.get('/products', protectAdmin, async (req, res) => {
  try {
    const { search, category, stockStatus, activeStatus, sort, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { nameTamil: regex },
        { tamilName: regex },
        { englishName: regex },
        { category: regex },
        { sku: regex }
      ];
    }
    if (category) {
      filter.category = category;
    }
    if (stockStatus) {
      if (stockStatus === 'low') filter.stock = { $gt: 0, $lte: 5 };
      else if (stockStatus === 'out') filter.stock = 0;
      else if (stockStatus === 'in') filter.stock = { $gt: 5 };
    }
    if (activeStatus) {
      filter.isActive = activeStatus === 'active';
    }

    let sortFilter = { createdAt: -1 };
    if (sort === 'price_asc') sortFilter = { price: 1 };
    else if (sort === 'price_desc') sortFilter = { price: -1 };
    else if (sort === 'newest') sortFilter = { createdAt: -1 };

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort(sortFilter)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    console.error('Fetch admin products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/admin/products — Add a product ─────────────────────────────────
router.post('/products', protectAdmin, async (req, res) => {
  try {
    const { name, category } = req.body;
    const exists = await Product.findOne({ name, category });
    if (exists) {
      return res.status(409).json({ message: 'Product name already exists in this category.' });
    }

    const product = new Product(req.body);
    const createdProduct = await product.save();

    // Broadcast change and log audit
    await logAuditAndEmit(req, 'Create Product', 'Product', createdProduct._id, createdProduct.name, null, createdProduct, 'product_update', createdProduct);

    // Asynchronously create notifications for all users
    (async () => {
      try {
        const users = await User.find({ isBlocked: { $ne: true } }).select('_id');
        const io = req.app.get('io');
        for (const user of users) {
          await createAndEmitNotification(io, {
            userId: user._id,
            title: 'New Product Added',
            message: `Check out our new product: "${createdProduct.name}" in category "${createdProduct.category}".`,
            type: 'general',
            role: 'customer',
            actionUrl: '/'
          });
        }
      } catch (bcErr) {
        console.error('Failed to broadcast new product notification:', bcErr);
      }
    })();

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

const productUpdateUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// ─── PUT /api/admin/products/:id — Edit product ───────────────────────────────
router.put('/products/:id', protectAdmin, productUpdateUpload, async (req, res) => {
  console.log('=== PRODUCT UPDATE DEBUG ===');
  console.log('Product ID:', req.params.id);
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);
  console.log('req.files:', req.files);

  try {
    const original = await Product.findById(req.params.id);
    if (!original) {
      console.log('Product not found:', req.params.id);
      return res.status(404).json({ message: 'Product not found' });
    }

    let hasUploadedFile = false;
    let newImageUrl = null;
    let newImagesUrls = [];

    if (req.files) {
      if (req.files.image && req.files.image.length > 0) {
        hasUploadedFile = true;
        newImageUrl = `http://localhost:5000/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.file && req.files.file.length > 0) {
        hasUploadedFile = true;
        newImageUrl = `http://localhost:5000/uploads/${req.files.file[0].filename}`;
      }
      if (req.files.thumbnail && req.files.thumbnail.length > 0) {
        hasUploadedFile = true;
        newImageUrl = `http://localhost:5000/uploads/${req.files.thumbnail[0].filename}`;
      }
      if (req.files.images && req.files.images.length > 0) {
        hasUploadedFile = true;
        newImagesUrls = req.files.images.map(file => `http://localhost:5000/uploads/${file.filename}`);
      }
    }
    if (req.file) {
      hasUploadedFile = true;
      newImageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    if (hasUploadedFile) {
      const updatePayload = {};
      if (newImageUrl) {
        updatePayload.image = newImageUrl;
      }
      if (newImagesUrls.length > 0) {
        updatePayload.images = newImagesUrls;
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: updatePayload },
        { new: true, runValidators: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }

      await logAuditAndEmit(req, 'Edit Product Image', 'Product', updatedProduct._id, updatedProduct.name, original, updatedProduct, 'product_update', updatedProduct);
      return res.status(200).json(updatedProduct);
    }

    // No new image uploaded via files
    // Ensure we keep existing image if not provided in request body
    if (!req.body.image && !req.body.imageUrl) {
      req.body.image = original.image;
    }
    if (!req.body.images || (Array.isArray(req.body.images) && req.body.images.length === 0)) {
      req.body.images = original.images;
    }

    // Do not overwrite _id, createdAt, updatedAt
    delete req.body._id;
    delete req.body.createdAt;
    delete req.body.updatedAt;

    // Validate images and image/imageUrl values in body
    if (req.body.images !== undefined) {
      if (!Array.isArray(req.body.images)) {
        if (typeof req.body.images === 'string') {
          req.body.images = [req.body.images];
        } else {
          req.body.images = [];
        }
      }
    }
    if (req.body.imageUrl !== undefined) {
      if (typeof req.body.imageUrl !== 'string') {
        req.body.imageUrl = String(req.body.imageUrl || '');
      }
      req.body.image = req.body.imageUrl;
    }
    if (req.body.image !== undefined) {
      if (typeof req.body.image !== 'string') {
        req.body.image = String(req.body.image || '');
      }
    }

    // Update inStock automatically if stock is updated
    if (req.body.stock !== undefined) {
      req.body.inStock = req.body.stock > 0;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const actionName = req.body.price !== undefined && req.body.price !== original.price ? 'Update Price' : req.body.stock !== undefined && req.body.stock !== original.stock ? 'Update Stock' : 'Edit Product';
    await logAuditAndEmit(req, actionName, req.body.price !== undefined ? 'Price' : req.body.stock !== undefined ? 'Stock' : 'Product', updatedProduct._id, updatedProduct.name, original, updatedProduct, 'product_update', updatedProduct);

    // Wishlist back in stock & price drop notifications
    (async () => {
      try {
        const isBackInStock = original.stock === 0 && req.body.stock !== undefined && req.body.stock > 0;
        const isPriceDropped = req.body.price !== undefined && req.body.price < original.price;

        if (isBackInStock || isPriceDropped) {
          const users = await User.find({ wishlist: req.params.id, isBlocked: { $ne: true } }).select('_id');
          const io = req.app.get('io');
          for (const user of users) {
            if (isBackInStock) {
              await createAndEmitNotification(io, {
                userId: user._id,
                title: 'Item Back in Stock!',
                message: `"${original.name}" is now back in stock! Grab yours before it runs out.`,
                type: 'wishlist',
                role: 'customer',
                actionUrl: '/'
              });
            }
            if (isPriceDropped) {
              await createAndEmitNotification(io, {
                userId: user._id,
                title: 'Price Dropped!',
                message: `Price dropped for "${original.name}"! It is now Rs. ${req.body.price} (was Rs. ${original.price}).`,
                type: 'wishlist',
                role: 'customer',
                actionUrl: '/'
              });
            }
          }
        }
      } catch (wlErr) {
        console.error('Failed to trigger wishlist notifications:', wlErr);
      }
    })();

    return res.status(200).json(updatedProduct);

  } catch (error) {
    console.error('=== PRODUCT UPDATE ERROR ===');
    console.error('Error Stack:', error.stack);
    console.error('Edit product error:', error);

    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Validation Error: ' + error.message });
    }
    return res.status(500).json({ message: 'Unexpected Error: ' + error.message });
  }
});

// ─── POST /api/admin/products/:id/duplicate — Duplicate product ──────────────
router.post('/products/:id/duplicate', protectAdmin, async (req, res) => {
  try {
    const original = await Product.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Product not found' });

    // Find unique name
    let duplicateName = `${original.name} (Copy)`;
    let nameExists = await Product.findOne({ name: duplicateName, category: original.category });
    let counter = 1;
    while (nameExists) {
      duplicateName = `${original.name} (Copy ${counter})`;
      nameExists = await Product.findOne({ name: duplicateName, category: original.category });
      counter++;
    }

    const duplicated = new Product({
      name: duplicateName,
      nameTamil: original.nameTamil ? `${original.nameTamil} (நகல்)` : '',
      tamilName: (original.nameTamil || original.tamilName) ? `${original.nameTamil || original.tamilName} (நகல்)` : '',
      price: original.price,
      category: original.category,
      image: original.image,
      images: original.images || [],
      inStock: original.inStock,
      stock: original.stock,
      unit: original.unit,
      description: original.description,
      isActive: original.isActive,
      isFeatured: original.isFeatured,
      discount: original.discount,
      offerTag: original.offerTag
    });

    const saved = await duplicated.save();

    // Broadcast change
    const io = req.app.get('io');
    if (io) io.emit('product_update', saved);

    res.status(201).json(saved);
  } catch (error) {
    console.error('Duplicate product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/admin/products/:id — Delete product ──────────────────────────
router.delete('/products/:id', protectAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });

    // Broadcast removal (client will delete item if in cart)
    const io = req.app.get('io');
    if (io) io.emit('product_update', { _id: req.params.id, isActive: false, isDeleted: true });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/admin/products/:id/status — Enable/Disable product ───────────
router.patch('/products/:id/status', protectAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const oldProd = await Product.findById(req.params.id);
    const updated = await Product.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Product not found' });

    // Broadcast change & log audit
    await logAuditAndEmit(req, 'Toggle Product Status', 'Product', updated._id, updated.name, oldProd?.isActive, isActive, 'product_update', updated);

    res.json(updated);
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/admin/products/bulk — Bulk updates ────────────────────────────
router.post('/products/bulk', protectAdmin, async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: 'No products selected' });
    }

    if (action === 'delete') {
      await Product.deleteMany({ _id: { $in: ids } });
      const io = req.app.get('io');
      if (io) {
        ids.forEach(id => io.emit('product_update', { _id: id, isActive: false, isDeleted: true }));
      }
    } else if (action === 'category') {
      await Product.updateMany({ _id: { $in: ids } }, { category: value });
    } else if (action === 'price') {
      const valStr = String(value);
      if (valStr.startsWith('+')) {
        const amt = parseFloat(valStr.substring(1));
        await Product.updateMany({ _id: { $in: ids } }, { $inc: { price: amt } });
      } else if (valStr.startsWith('-')) {
        const amt = parseFloat(valStr.substring(1));
        await Product.updateMany({ _id: { $in: ids } }, { $inc: { price: -amt } });
      } else {
        const amt = parseFloat(valStr);
        await Product.updateMany({ _id: { $in: ids } }, { price: amt });
      }
    } else if (action === 'status') {
      const activeState = value === 'active' || value === true;
      await Product.updateMany({ _id: { $in: ids } }, { isActive: activeState });
    } else if (action === 'stock') {
      const valStr = String(value);
      if (valStr.startsWith('+')) {
        const amt = parseInt(valStr.substring(1));
        const prods = await Product.find({ _id: { $in: ids } });
        for (const prod of prods) {
          prod.stock = (prod.stock || 0) + amt;
          prod.inStock = prod.stock > 0;
          await prod.save();
        }
      } else if (valStr.startsWith('-')) {
        const amt = parseInt(valStr.substring(1));
        const prods = await Product.find({ _id: { $in: ids } });
        for (const prod of prods) {
          prod.stock = Math.max(0, (prod.stock || 0) - amt);
          prod.inStock = prod.stock > 0;
          await prod.save();
        }
      } else {
        const amt = parseInt(valStr);
        await Product.updateMany({ _id: { $in: ids } }, { stock: amt, inStock: amt > 0 });
      }
    }

    // Broadcast new state for all affected products
    const affected = await Product.find({ _id: { $in: ids } });
    const io = req.app.get('io');
    if (io) {
      affected.forEach(prod => {
        io.emit('product_update', prod);
      });
    }

    res.json({ message: 'Bulk action completed successfully' });
  } catch (error) {
    console.error('Bulk products update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/admin/users — List all users with search & order count ─────────
router.get('/users', protectAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { fullName: regex },
          { phoneNumber: regex },
          { email: regex }
        ]
      };
    }
    const users = await User.find(query).select('fullName phoneNumber email isBlocked blockedReason createdAt isVerified').sort({ createdAt: -1 }).lean();
    
    // Compute totalOrders for each user
    const usersWithOrders = await Promise.all(users.map(async (u) => {
      const count = await Order.countDocuments({ user: u._id });
      return { ...u, totalOrders: count };
    }));

    res.json(usersWithOrders);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/admin/users/:id/block — Block/Unblock user ───────────────────
router.patch('/users/:id/block', protectAdmin, async (req, res) => {
  try {
    const { isBlocked, reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isBlocked,
        blockedAt: isBlocked ? new Date() : null,
        blockedReason: isBlocked ? reason : '',
      },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User account has been ${isBlocked ? 'blocked' : 'unblocked'}.`, user });
  } catch (error) {
    console.error('Block/unblock user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/admin/users/:id/orders — View order history for a single user ────
router.get('/users/:id/orders', protectAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Fetch user orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/admin/users/:id — Permanently delete a user account ──────────
// Security: Only authenticated admins (SuperAdmin or Admin role) can delete users.
// Returns HTTP 403 if called without valid admin token (enforced by protectAdmin).
router.delete('/users/:id', protectAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Fetch the user before deletion (for audit log and response)
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent deletion of admin accounts via this endpoint
    if (user.isAdmin || user.role === 'SuperAdmin' || user.role === 'Admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted through this endpoint.' });
    }

    const deletedUserInfo = {
      fullName:    user.fullName,
      phoneNumber: user.phoneNumber,
      email:       user.email,
    };

    // 2. Permanently delete the user document from the Users collection
    await User.findByIdAndDelete(userId);

    // 3. Remove all PendingUser records tied to this phone/email
    //    (handles partially-registered duplicate records)
    await PendingUser.deleteMany({
      $or: [
        { email:       user.email },
        { phoneNumber: user.phoneNumber },
      ],
    });

    // 4. Remove all PasswordReset / OTP records for this email
    await PasswordReset.deleteMany({ email: user.email });

    // 5. Remove all user-scoped Notifications (customer-side)
    //    Notification model uses userId as ObjectId ref — pass the string id
    await Notification.deleteMany({ userId: userId });

    // 6. AdminNotification records are system-wide (no user FK in that schema),
    //    so there is nothing user-specific to remove there.

    // 7. Record the deletion in the Admin Activity / Audit Log
    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action:     'Deleted User',
      targetType: 'User',
      targetId:   String(userId),
      targetName: deletedUserInfo.fullName,
      oldValue: {
        fullName:    deletedUserInfo.fullName,
        phoneNumber: deletedUserInfo.phoneNumber,
        email:       deletedUserInfo.email,
      },
      newValue: null,
    });

    // 8. Broadcast real-time update so the admin dashboard refreshes instantly
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


// ─── GET /api/admin/orders — List all orders with filters ──────────────────────
router.get('/orders', protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, startDate, endDate } = req.query;

    const filter = { paymentMethod: 'COD' };
    if (status) {
      filter.status = status;
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    if (search) {
      if (mongoose.Types.ObjectId.isValid(search)) {
        filter._id = search;
      } else {
        // Search by invoice number
        filter.invoiceNumber = { $regex: search, $options: 'i' };
      }
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('user', 'fullName phoneNumber email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    console.error('Fetch admin orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/admin/orders/:id — Single order detail ─────────────────────────
router.get('/orders/:id', protectAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'fullName phoneNumber email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/admin/orders/:id/status — Update order status ────────────────
router.patch('/orders/:id/status', protectAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Allowed transition logic (Requirement: Backend Validation)
    const allowedTransitions = {
      Pending: ["Accepted", "Cancelled"],
      Accepted: ["Out for Delivery"],
      "Out for Delivery": ["Delivered"],
      Delivered: [],
      Cancelled: []
    };

    const currentStatus = order.status || 'Pending';
    const nextStatuses = allowedTransitions[currentStatus] || [];

    if (!nextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status transition'
      });
    }

    // Set status
    order.status = status;

    // Notifications note text (Requirement: User Notifications)
    let noteText = `Status changed to ${status} by admin`;
    if (status === 'Accepted') {
      noteText = "Your order has been accepted.";
    } else if (status === 'Out for Delivery') {
      noteText = "Your order is out for delivery and will arrive shortly.";
    } else if (status === 'Delivered') {
      noteText = "Your order has been delivered successfully.";
    } else if (status === 'Cancelled') {
      noteText = "Your order has been cancelled.";
    }
    order.statusHistory.push({ status, note: noteText });

    // Restock items if Cancelled
    if (status === 'Cancelled') {
      for (const item of order.orderItems) {
        if (item.product) {
          const prod = await Product.findById(item.product);
          if (prod) {
            prod.stock = (prod.stock || 0) + item.quantity;
            if (prod.stock > 0) prod.inStock = true;
            await prod.save();
          }
        }
      }
    }

    // Mark as delivered and paid
    if (status === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
      order.paymentStatus = 'Paid';
    }

    await order.save();

    // Real-Time Synchronization via Socket.io (Requirement: Real-Time Updates)
    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', { orderId: order._id, status, invoiceNumber: order.invoiceNumber });
      io.emit('order_update', { orderId: order._id, status });
    }

    // Trigger customer notification for order status change
    let statusTitle = `Order Status Updated`;
    let statusMessage = `Your order ${order.invoiceNumber} status is now ${status}.`;
    
    if (status === 'Accepted') {
      statusTitle = 'Order Accepted';
      statusMessage = `Your order ${order.invoiceNumber} has been accepted.`;
    } else if (status === 'Out for Delivery') {
      statusTitle = 'Out for Delivery';
      statusMessage = `Your order ${order.invoiceNumber} is out for delivery.`;
    } else if (status === 'Delivered') {
      statusTitle = 'Order Delivered';
      statusMessage = `Your order ${order.invoiceNumber} has been delivered successfully.`;
    } else if (status === 'Cancelled') {
      statusTitle = 'Order Cancelled';
      statusMessage = `Your order ${order.invoiceNumber} has been cancelled.`;
    }

    if (order.user) {
      await createAndEmitNotification(io, {
        userId: order.user,
        title: statusTitle,
        message: statusMessage,
        type: (status === 'Out for Delivery' || status === 'Delivered') ? 'delivery' : 'order',
        role: 'customer',
        link: '/profile'
      });
    }

    // Trigger admin notification if status is Accepted or Cancelled
    if (status === 'Accepted') {
      const orderUserForNotif = order.user ? await User.findById(order.user).lean() : null;
      const totalItemsForNotif = order.orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      await createAndEmitNotification(io, {
        title: 'Order Accepted',
        message: `Order ${order.invoiceNumber} has been accepted.`,
        type: 'order_accepted',
        role: 'admin',
        link: '/admin/orders',
        customerName: orderUserForNotif ? (orderUserForNotif.fullName || '') : (order.recipient?.name || ''),
        phone: orderUserForNotif ? (orderUserForNotif.phoneNumber || '') : (order.recipient?.phone || ''),
        orderId: order._id,
        invoiceNumber: order.invoiceNumber || '',
        orderTotal: order.totalPrice || 0,
        totalItems: totalItemsForNotif,
        paymentMethod: order.paymentMethod || 'COD',
        orderStatus: 'Accepted'
      });
    } else if (status === 'Cancelled') {
      const orderUserForNotif = order.user ? await User.findById(order.user).lean() : null;
      const totalItemsForNotif = order.orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      await createAndEmitNotification(io, {
        title: 'Order Cancelled',
        message: `Order ${order.invoiceNumber} has been cancelled.`,
        type: 'order_cancelled',
        role: 'admin',
        link: '/admin/orders',
        customerName: orderUserForNotif ? (orderUserForNotif.fullName || '') : (order.recipient?.name || ''),
        phone: orderUserForNotif ? (orderUserForNotif.phoneNumber || '') : (order.recipient?.phone || ''),
        orderId: order._id,
        invoiceNumber: order.invoiceNumber || '',
        orderTotal: order.totalPrice || 0,
        totalItems: totalItemsForNotif,
        paymentMethod: order.paymentMethod || 'COD',
        orderStatus: 'Cancelled'
      });
    }

    res.json({ success: true, message: `Order status updated to ${status}.`, order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/admin/notifications — Fetch feed ────────────────────────────────
router.get('/notifications', protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead, search } = req.query;
    const filter = { role: 'admin' };
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ title: { $regex: regex } }, { message: { $regex: regex } }];
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ role: 'admin', isRead: false });

    res.json({
      notifications,
      unreadCount,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/admin/notifications/mark-read — Mark all as read ───────────────
router.patch('/notifications/mark-read', protectAdmin, async (req, res) => {
  try {
    await Notification.updateMany({ role: 'admin', isRead: false }, { isRead: true });
    
    // Broadcast unread count to admins
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('admin:notification:unreadCount', { count: 0 });
      io.emit('admin:notification:unreadCount', { count: 0 });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/admin/notifications/:id/read — Mark single as read ───────────────
router.patch('/notifications/:id/read', protectAdmin, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, role: 'admin' },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    // Broadcast unread count to admins
    const io = req.app.get('io');
    if (io) {
      const count = await Notification.countDocuments({ role: 'admin', isRead: false });
      io.to('admin').emit('admin:notification:unreadCount', { count });
      io.emit('admin:notification:unreadCount', { count });
    }

    res.json({ success: true, notification: notif });
  } catch (error) {
    console.error('Mark single notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/admin/notifications/clear-all — Clear all notifications ───────────────
router.delete('/notifications/clear-all', protectAdmin, async (req, res) => {
  try {
    await Notification.deleteMany({ role: 'admin' });

    // Broadcast unread count
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('admin:notification:unreadCount', { count: 0 });
      io.emit('admin:notification:unreadCount', { count: 0 });
    }

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/admin/notifications/delete-read — Delete all read notifications ──
router.delete('/notifications/delete-read', protectAdmin, async (req, res) => {
  try {
    await Notification.deleteMany({ role: 'admin', isRead: true });

    const io = req.app.get('io');
    if (io) {
      const count = await Notification.countDocuments({ role: 'admin', isRead: false });
      io.to('admin').emit('admin:notification:unreadCount', { count });
      io.emit('admin:notification:unreadCount', { count });
    }

    res.json({ success: true, message: 'All read notifications deleted' });
  } catch (error) {
    console.error('Delete read notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/admin/notifications/:id — Delete single notification ───────────────
router.delete('/notifications/:id', protectAdmin, async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, role: 'admin' });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    // Broadcast unread count
    const io = req.app.get('io');
    if (io) {
      const count = await Notification.countDocuments({ role: 'admin', isRead: false });
      io.to('admin').emit('admin:notification:unreadCount', { count });
      io.emit('admin:notification:unreadCount', { count });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/admin/reports — Detailed statistics extraction ───────────────────
router.get('/reports', protectAdmin, async (req, res) => {
  try {
    console.log('[GET /api/admin/reports] Generating reports...');
    const [orders, products, users] = await Promise.all([
      Order.find({}).populate('user', 'fullName').sort({ createdAt: -1 }).catch(() => []),
      Product.find({}).sort({ name: 1 }).catch(() => []),
      User.find({ $or: [{ isAdmin: false }, { role: 'User' }, { role: 'user' }] }).sort({ createdAt: -1 }).catch(() => []),
    ]);

    // Format reports for CSV consumption or PDF rendering
    const salesReport = (orders || []).map(o => ({
      invoiceNumber: o.invoiceNumber || (o._id ? o._id.toString().slice(-6).toUpperCase() : 'N/A'),
      customer: o.user?.fullName || o.recipient?.name || 'Guest',
      itemsCount: (o.orderItems || []).reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0),
      totalPrice: Number(o.totalPrice) || 0,
      status: o.status || 'Pending',
      paymentStatus: o.paymentStatus || 'Pending',
      date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : 'N/A'
    }));

    const productReport = (products || []).map(p => ({
      name: p.name || 'Unnamed',
      nameTamil: p.nameTamil || '',
      category: p.category || 'General',
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      isActive: p.isActive ? 'Active' : 'Inactive',
      offer: p.offerTag || 'None'
    }));

    const customerReport = (users || []).map(u => ({
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

// Consolidated search is registered at the top of the file

// ─── GET /api/admin/settings — Get store settings ──────────────────────────
router.get('/settings', protectAdmin, async (req, res) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({
        storeName: 'Tiruchendur Murugan Palumanicholai',
        location: { lat: 13.0606941, lon: 80.2270751 },
        // Temporary testing value. Change back to 5 KM before production.
        deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 5,
      });
    }
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/admin/settings — Update store settings ───────────────────────
router.put('/settings', protectAdmin, async (req, res) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = new StoreSettings({});
    }

    const fields = [
      'storeName', 'storeLogo', 'storeAddress', 'phone', 'email', 'supportWhatsApp', 'workingHours',
      'deliveryRadiusKm', 'currency', 'gstPercentage', 'invoicePrefix', 'invoiceFooter', 'storeDescription',
      'websiteName', 'websiteLogo', 'browserTitle', 'favicon', 'primaryThemeColor', 'secondaryThemeColor',
      'homepageBanner', 'announcementBanner', 'footerContent',
      'defaultLanguage', 'defaultCurrency', 'defaultTheme', 'enableProductReviews', 'enableWishlist',
      'enableSearchSuggestions', 'enableNotifications',
      'maintenanceMode',
      'disableCustomerLogin', 'disableRegistration', 'disableCheckout', 'disableForgotPassword', 'disableOrderPlacement',
      'minOrderValue', 'maxOrderValue', 'freeDeliveryThreshold', 'deliveryCharges', 'deliveryTiming',
      'orderPrefix', 'autoAcceptOrders', 'autoGenerateInvoice', 'cancellationTimeLimit',
      'enableOrderNotifications', 'enableRegistrationNotifications', 'enableLowStockAlerts',
      'enableOfferNotifications', 'enableEmailNotifications', 'enableBrowserNotifications',
      'sessionTimeout', 'maxLoginAttempts', 'passwordPolicy', 'admin2FA',
      'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'senderName', 'senderEmail',
      'dashboardRefreshInterval', 'enableSalesCharts', 'enableRevenueReports', 'enableTopProducts', 'enableCustomerStats',
      'offersBanner', 'aboutUs', 'contactUs', 'privacyPolicy', 'termsAndConditions'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    if (req.body.lat !== undefined && req.body.lon !== undefined) {
      settings.location = { lat: Number(req.body.lat), lon: Number(req.body.lon) };
    }

    if (req.body.orderStatusColors !== undefined) {
      settings.orderStatusColors = req.body.orderStatusColors;
    }

    const isAnnouncementChanged = settings.isModified('announcementBanner');
    const isMaintenanceChanged = settings.isModified('maintenanceMode');

    await settings.save();

    // Trigger announcements/maintenance notifications
    if (isAnnouncementChanged || isMaintenanceChanged) {
      (async () => {
        try {
          const users = await User.find({ isBlocked: { $ne: true } }).select('_id');
          const io = req.app.get('io');
          
          if (isAnnouncementChanged && settings.announcementBanner) {
            for (const user of users) {
              await createAndEmitNotification(io, {
                userId: user._id,
                title: 'New Store Announcement',
                message: settings.announcementBanner,
                type: 'general',
                role: 'customer',
                actionUrl: '/'
              });
            }
          }
          
          if (isMaintenanceChanged) {
            for (const user of users) {
              await createAndEmitNotification(io, {
                userId: user._id,
                title: settings.maintenanceMode ? 'System Under Maintenance' : 'System Maintenance Completed',
                message: settings.maintenanceMode 
                  ? 'We are performing system upgrades. Ordering is temporarily disabled.'
                  : 'System upgrades are complete. You can now place orders normally!',
                type: 'system',
                role: 'customer',
                actionUrl: '/'
              });
            }
          }
        } catch (setNotifErr) {
          console.error('Failed to broadcast store settings notification:', setNotifErr);
        }
      })();
    }

    // Emit Socket.IO settings update
    const io = req.app.get('io');
    if (io) {
      io.emit('settings_update', settings);
    }

    // Add Audit Log
    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Update System Settings',
      targetType: 'System',
      targetName: 'StoreSettings',
      oldValue: 'Previous Configuration',
      newValue: 'Updated Configuration'
    });

    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ============================================================================
// PAYMENTS MANAGEMENT APIS
// ============================================================================
router.get('/payments', protectAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    if (status && status !== 'All') {
      if (status === 'COD') query.paymentMethod = 'COD';
      else query.paymentStatus = status;
    }
    const orders = await Order.find(query).populate('user', 'fullName phoneNumber email').sort({ createdAt: -1 });
    
    let formatted = orders.map(o => ({
      _id: o._id,
      orderId: o.invoiceNumber || o._id.toString().slice(-6).toUpperCase(),
      customerName: o.user ? o.user.fullName : (o.recipient?.name || 'Guest'),
      phoneNumber: o.user ? o.user.phoneNumber : (o.recipient?.phone || 'N/A'),
      paymentMethod: o.paymentMethod || 'COD',
      amount: o.totalPrice,
      paymentStatus: o.paymentStatus || 'Pending',
      date: o.createdAt,
      updatedBy: (o.paymentAuditLog && o.paymentAuditLog.length > 0) ? o.paymentAuditLog[o.paymentAuditLog.length - 1].updatedBy : 'System',
      auditLog: o.paymentAuditLog || []
    }));

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      formatted = formatted.filter(p => 
        p.orderId.toLowerCase().includes(s) ||
        p.customerName.toLowerCase().includes(s) ||
        p.phoneNumber.includes(s)
      );
    }

    res.json(formatted);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/payments/:id/status', protectAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order payment not found' });

    const oldStatus = order.paymentStatus || 'Pending';
    order.paymentStatus = status;
    order.paymentAuditLog.push({
      updatedBy: req.admin?.name || 'Admin',
      oldStatus,
      newStatus: status,
      updatedTime: new Date()
    });

    await order.save();

    // Trigger customer notification for payment updates
    if (order.user) {
      try {
        const io = req.app.get('io');
        if (status === 'Paid') {
          await createAndEmitNotification(io, {
            userId: order.user,
            title: 'Payment Completed',
            message: `Your payment of Rs. ${order.totalPrice} for order ${order.invoiceNumber} has been marked as Paid.`,
            type: 'payment',
            role: 'customer',
            link: '/profile'
          });
        } else if (status === 'Refunded') {
          await createAndEmitNotification(io, {
            userId: order.user,
            title: 'Refund Processed',
            message: `A refund of Rs. ${order.totalPrice} for order ${order.invoiceNumber} has been successfully processed.`,
            type: 'payment',
            role: 'customer',
            link: '/profile'
          });
        }
      } catch (payNotifErr) {
        console.error('Failed to trigger payment update notification:', payNotifErr);
      }
    }

    await logAuditAndEmit(req, 'Update Payment Status', 'Payment', order._id, `Order #${order.invoiceNumber}`, oldStatus, status, 'payment_updated', { orderId: order._id, paymentStatus: status, userId: order.user });
    const io = req.app.get('io');
    if (io) io.emit('payment_update', { orderId: order._id, paymentStatus: status });

    res.json({ message: `Payment status updated to ${status}`, order });
  } catch (err) {
    console.error('Update payment status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ============================================================================
// CATEGORIES MANAGEMENT APIS
// ============================================================================
// ============================================================================
// CATEGORIES MANAGEMENT APIS
// ============================================================================
router.get('/categories', protectAdmin, async (req, res) => {
  try {
    await ensureDefaultCategories();
    const { search } = req.query;
    let query = {};
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      query = { $or: [{ name: regex }, { tamilName: regex }, { description: regex }] };
    }
    const categories = await Category.find(query).sort({ displayOrder: 1, createdAt: -1 }).lean();
    
    const withCount = await Promise.all(categories.map(async (cat) => {
      const n = cat.name.toLowerCase().trim();
      let slug = n.replace(/[^a-z0-9]+/g, '-');
      if (n === 'vegetables' || n.includes('veg')) slug = 'vegetables';
      else if (n === 'fruits' || n.includes('fruit')) slug = 'fruits';
      else if (n.includes('dairy')) slug = 'dairy';
      else if (n.includes('biscuit') || n.includes('cookie')) slug = 'biscuits';
      else if (n.includes('snack')) slug = 'snacks';
      else if (n.includes('masala')) slug = 'masala';
      else if (n.includes('oil')) slug = 'oils';
      else if (n.includes('detergent') || n.includes('cleaner') || n.includes('soap')) slug = 'detergents';
      else if (n.includes('pickle')) slug = 'pickles';
      else if (n.includes('other')) slug = 'others';

      const count = await Product.countDocuments({
        category: { $in: [slug, cat.name, cat.name.toLowerCase(), cat.name.toLowerCase().replace(/\s+/g, '-')] }
      });
      return { 
        ...cat, 
        status: cat.isActive !== false ? 'Active' : 'Hidden',
        productCount: count 
      };
    }));

    res.json(withCount);
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/categories', protectAdmin, async (req, res) => {
  try {
    const { name, tamilName, description, image, displayOrder, status } = req.body;
    const exists = await Category.findOne({ name });
    if (exists) return res.status(409).json({ message: 'Category name already exists' });

    const isActive = status !== 'Hidden' && status !== 'Disabled';

    const cat = await Category.create({ 
      name, 
      tamilName, 
      description, 
      image, 
      displayOrder, 
      isActive 
    });

    const catObj = cat.toObject();
    catObj.status = cat.isActive ? 'Active' : 'Hidden';

    await logAuditAndEmit(req, 'Create Category', 'Category', cat._id, cat.name, null, cat, 'category_update', catObj);
    res.status(201).json(catObj);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/categories/:id', protectAdmin, async (req, res) => {
  try {
    const oldCat = await Category.findById(req.params.id);
    if (!oldCat) return res.status(404).json({ message: 'Category not found' });

    const updateData = { ...req.body };
    if (updateData.status !== undefined) {
      updateData.isActive = updateData.status !== 'Hidden' && updateData.status !== 'Disabled';
      delete updateData.status;
    }

    const cat = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    const catObj = cat.toObject();
    catObj.status = cat.isActive ? 'Active' : 'Hidden';

    await logAuditAndEmit(req, 'Edit Category', 'Category', cat._id, cat.name, oldCat, cat, 'category_update', catObj);
    res.json(catObj);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/categories/:id', protectAdmin, async (req, res) => {
  try {
    const oldCat = await Category.findById(req.params.id);
    await Category.findByIdAndDelete(req.params.id);
    if (oldCat) {
      await logAuditAndEmit(req, 'Delete Category', 'Category', oldCat._id, oldCat.name, oldCat, null, 'category_update', { _id: req.params.id, deleted: true });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/categories/:id/status', protectAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const oldCat = await Category.findById(req.params.id);
    if (!oldCat) return res.status(404).json({ message: 'Category not found' });

    const isActive = status !== 'Hidden' && status !== 'Disabled';
    const cat = await Category.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    
    const catObj = cat.toObject();
    catObj.status = cat.isActive ? 'Active' : 'Hidden';

    await logAuditAndEmit(req, 'Toggle Category Status', 'Category', cat?._id, cat?.name, oldCat?.isActive ? 'Active' : 'Hidden', status, 'category_update', catObj);
    res.json(catObj);
  } catch (err) {
    console.error('Toggle category status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// OFFERS MANAGEMENT APIS
// ============================================================================
router.get('/offers', protectAdmin, async (req, res) => {
  try {
    const offers = await Offer.find({}).sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    console.error('Fetch offers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const validateOfferPayload = (body) => {
  const { title, discountPercentage, minOrderValue, validFrom, validUntil } = body;
  if (!title || !String(title).trim()) {
    return 'Validation failed: Title cannot be empty.';
  }
  const dp = Number(discountPercentage);
  if (isNaN(dp) || dp < 1 || dp > 100) {
    return 'Validation failed: Discount percentage must be between 1 and 100.';
  }
  const mov = Number(minOrderValue);
  if (isNaN(mov) || mov < 0) {
    return 'Validation failed: Minimum order value cannot be negative.';
  }
  if (!validFrom || !validUntil) {
    return 'Validation failed: Missing valid date range fields.';
  }
  const fromDate = new Date(validFrom);
  const untilDate = new Date(validUntil);
  if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
    return 'Validation failed: Invalid date supplied.';
  }
  if (untilDate < fromDate) {
    return 'Validation failed: Valid Until date must be on or after Valid From date.';
  }
  return null;
};

router.post('/offers', protectAdmin, async (req, res) => {
  console.log('[Offer] Request received', req.body);
  try {
    const validationError = validateOfferPayload(req.body);
    if (validationError) {
      console.error(`[Offer Error] ${validationError}`);
      return res.status(400).json({ message: validationError });
    }
    console.log('[Offer] Validation passed');
    console.log('[Offer] Saving to database');
    const offer = await Offer.create(req.body);
    console.log('[Offer] Saved successfully');
    await logAuditAndEmit(req, 'Create Offer', 'Offer', offer._id, offer.title, null, offer, 'offer_update', offer);

    // Asynchronously broadcast offer notification to all users
    (async () => {
      try {
        const users = await User.find({ isBlocked: { $ne: true } }).select('_id');
        const io = req.app.get('io');
        for (const user of users) {
          await createAndEmitNotification(io, {
            userId: user._id,
            title: `New Offer: ${offer.title}`,
            message: offer.description || `Get ${offer.discount || 0}% off!`,
            type: 'offer',
            role: 'customer',
            actionUrl: '/'
          });
        }
      } catch (bcErr) {
        console.error('Failed to broadcast offer notification:', bcErr);
      }
    })();

    res.status(201).json(offer);
  } catch (err) {
    const fullError = err.message || String(err);
    console.error(`[Offer Error] ${fullError}`);
    let errorMessage = 'Database connection or server failed while saving offer.';
    if (err.name === 'ValidationError') {
      errorMessage = `Validation failed: ${Object.values(err.errors).map(e => e.message).join(', ')}`;
    } else if (err.code === 11000) {
      errorMessage = 'Duplicate offer title already exists.';
    }
    res.status(400).json({ message: errorMessage, error: fullError });
  }
});

router.put('/offers/:id', protectAdmin, async (req, res) => {
  console.log('[Offer] Update request received', req.params.id, req.body);
  try {
    const validationError = validateOfferPayload(req.body);
    if (validationError) {
      console.error(`[Offer Error] ${validationError}`);
      return res.status(400).json({ message: validationError });
    }
    console.log('[Offer] Validation passed');
    console.log('[Offer] Saving to database');
    const oldOffer = await Offer.findById(req.params.id);
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    console.log('[Offer] Saved successfully');
    await logAuditAndEmit(req, 'Edit Offer', 'Offer', offer._id, offer.title, oldOffer, offer, 'offer_update', offer);
    res.json(offer);
  } catch (err) {
    const fullError = err.message || String(err);
    console.error(`[Offer Error] ${fullError}`);
    let errorMessage = 'Database connection or server failed while updating offer.';
    if (err.name === 'ValidationError') {
      errorMessage = `Validation failed: ${Object.values(err.errors).map(e => e.message).join(', ')}`;
    } else if (err.code === 11000) {
      errorMessage = 'Duplicate offer title already exists.';
    }
    res.status(400).json({ message: errorMessage, error: fullError });
  }
});

router.delete('/offers/:id', protectAdmin, async (req, res) => {
  try {
    const oldOffer = await Offer.findById(req.params.id);
    await Offer.findByIdAndDelete(req.params.id);
    if (oldOffer) await logAuditAndEmit(req, 'Delete Offer', 'Offer', oldOffer._id, oldOffer.title, oldOffer, null, 'offer_update', { _id: req.params.id, deleted: true });
    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    console.error('Delete offer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/offers/:id/status', protectAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const oldOffer = await Offer.findById(req.params.id);
    const offer = await Offer.findByIdAndUpdate(req.params.id, { status }, { new: true });
    await logAuditAndEmit(req, 'Toggle Offer Status', 'Offer', offer?._id, offer?.title, oldOffer?.status, status, 'offer_update', offer);
    res.json(offer);
  } catch (err) {
    console.error('Patch offer status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// REPORTS & ANALYTICS APIS
// ============================================================================
router.get('/reports/analytics', protectAdmin, async (req, res) => {
  try {
    console.log(`[Reports API] Fetching analytics... MongoDB readyState: ${mongoose.connection.readyState}`);

    const { filter = 'Today', startDate, endDate, reportType = 'Sales Report' } = req.query;

    // ── 1. Build date range in Asia/Kolkata timezone ────────────────────────
    const getKolkataNow = () => {
      const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      return new Date(s);
    };

    const nowK = getKolkataNow();
    let startK = new Date(nowK);
    let endK = new Date(nowK);

    if (filter === 'Today') {
      startK.setHours(0, 0, 0, 0);
      endK.setHours(23, 59, 59, 999);
    } else if (filter === 'Yesterday') {
      startK.setDate(startK.getDate() - 1);
      startK.setHours(0, 0, 0, 0);
      endK.setDate(endK.getDate() - 1);
      endK.setHours(23, 59, 59, 999);
    } else if (filter === 'This Week') {
      const day = nowK.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      startK.setDate(nowK.getDate() - diff);
      startK.setHours(0, 0, 0, 0);
      endK.setHours(23, 59, 59, 999);
    } else if (filter === 'Last Week') {
      const day = nowK.getDay();
      const diff = day === 0 ? 6 : day - 1;
      startK.setDate(nowK.getDate() - diff - 7);
      startK.setHours(0, 0, 0, 0);
      endK.setDate(nowK.getDate() - diff - 1);
      endK.setHours(23, 59, 59, 999);
    } else if (filter === 'This Month') {
      startK = new Date(nowK.getFullYear(), nowK.getMonth(), 1, 0, 0, 0, 0);
      endK = new Date(nowK.getFullYear(), nowK.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filter === 'Last Month') {
      startK = new Date(nowK.getFullYear(), nowK.getMonth() - 1, 1, 0, 0, 0, 0);
      endK = new Date(nowK.getFullYear(), nowK.getMonth(), 0, 23, 59, 59, 999);
    } else if (filter === 'This Year') {
      startK = new Date(nowK.getFullYear(), 0, 1, 0, 0, 0, 0);
      endK = new Date(nowK.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (filter === 'Custom Date Range' || filter === 'Custom Range') {
      if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          startK = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
          endK = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
        }
      }
    }

    const toUtc = (d) => {
      const utcMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
      return new Date(utcMs - 330 * 60 * 1000);
    };

    const filterStart = toUtc(startK);
    const filterEnd   = toUtc(endK);

    const dateMatch = { createdAt: { $gte: filterStart, $lte: filterEnd } };

    // ── 2. Revenue match: only Paid orders or COD-Delivered ─────────────────
    // NEVER count: Cancelled, Refunded, Pending orders
    const revenueMatch = {
      status: { $in: ['Accepted', 'Out for Delivery', 'Delivered'] },
      $or: [
        { paymentStatus: 'Paid' },
        { paymentMethod: 'COD', status: 'Delivered' },
      ],
    };
    const completedMatch = { status: { $ne: 'Cancelled' } };

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const todayStart        = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // ── 3. Run all aggregations in parallel ─────────────────────────────────
    const [
      filteredRevenueAgg,
      filteredOrderCount,
      monthlyRevenueAgg,
      pendingPaymentsCount,
      totalCustomers,
      totalProducts,
      orderStatusAgg,
      newTodayCount,
      newThisMonthCount,
      dailySalesAgg,
      monthlySalesAgg,
      topProductsAgg,
      categoryRevenueAgg,
      lowStockProducts,
      outOfStockProducts,
      recentOrders,
      filteredOrdersForTable,
      allActiveProducts,
      allCustomers,
      paymentAnalyticsAgg,
    ] = await Promise.all([

      // [0] Filtered revenue (Paid or COD-Delivered, within date range)
      Order.aggregate([
        { $match: { ...revenueMatch, ...dateMatch } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),

      // [1] Filtered order count (non-cancelled)
      Order.countDocuments({ ...completedMatch, ...dateMatch }),

      // [2] Monthly revenue (current calendar month, always)
      Order.aggregate([
        { $match: { ...revenueMatch, createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),

      // [3] Pending payments (global, filter-independent)
      Order.countDocuments({ paymentStatus: 'Pending', status: { $ne: 'Cancelled' } }),

      // [4] Total active customers (global)
      User.countDocuments({ isAdmin: { $ne: true }, role: { $nin: ['Admin', 'SuperAdmin', 'Super Admin'] } }),

      // [5] Total active products (global)
      Product.countDocuments({ isActive: true }),

      // [6] Order status breakdown (global)
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // [7] New customers today (global)
      User.countDocuments({
        isAdmin: { $ne: true },
        role: { $nin: ['Admin', 'SuperAdmin', 'Super Admin'] },
        createdAt: { $gte: todayStart },
      }),

      // [8] New customers this month (global)
      User.countDocuments({
        isAdmin: { $ne: true },
        role: { $nin: ['Admin', 'SuperAdmin', 'Super Admin'] },
        createdAt: { $gte: currentMonthStart },
      }),

      // [9] Daily sales — last 7 days real aggregation
      Order.aggregate([
        {
          $match: {
            ...completedMatch,
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0) },
          },
        },
        {
          $group: {
            _id: {
              year:  { $year:  '$createdAt' },
              month: { $month: '$createdAt' },
              day:   { $dayOfMonth: '$createdAt' },
            },
            orders:  { $sum: 1 },
            revenue: { $sum: '$totalPrice' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // [10] Monthly timeline — last 12 months real aggregation
      Order.aggregate([
        {
          $match: {
            ...completedMatch,
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
          },
        },
        {
          $group: {
            _id:     { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            orders:  { $sum: 1 },
            revenue: { $sum: '$totalPrice' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // [11] Top 10 products by quantity sold (all non-cancelled orders)
      Order.aggregate([
        { $match: completedMatch },
        { $unwind: '$orderItems' },
        {
          $group: {
            _id:     '$orderItems.product',
            name:    { $first: '$orderItems.name' },
            image:   { $first: '$orderItems.image' },
            sold:    { $sum: '$orderItems.quantity' },
            revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } },
          },
        },
        { $sort: { sold: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'products', localField: '_id', foreignField: '_id', as: 'prod',
          },
        },
        {
          $project: {
            name: 1, image: 1, sold: 1, revenue: 1,
            tamilName: { $ifNull: [{ $first: '$prod.nameTamil' }, ''] },
            category:  { $ifNull: [{ $first: '$prod.category'  }, ''] },
          },
        },
      ]),

      // [12] Category revenue from order items (all non-cancelled)
      Order.aggregate([
        { $match: completedMatch },
        { $unwind: '$orderItems' },
        {
          $lookup: {
            from: 'products', localField: 'orderItems.product', foreignField: '_id', as: 'prod',
          },
        },
        {
          $group: {
            _id:     { $ifNull: [{ $first: '$prod.category' }, 'General'] },
            sold:    { $sum: '$orderItems.quantity' },
            revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      // [13] Low stock (active, 0 < stock <= 5)
      Product.find({ isActive: true, stock: { $gt: 0, $lte: 5 } })
        .select('name nameTamil category stock unit').sort({ stock: 1 }).lean(),

      // [14] Out of stock (active, stock = 0)
      Product.find({ isActive: true, stock: 0 })
        .select('name nameTamil category unit').sort({ name: 1 }).lean(),

      // [15] Recent 10 orders
      Order.find({})
        .populate('user', 'fullName phoneNumber')
        .sort({ createdAt: -1 }).limit(10)
        .select('invoiceNumber totalPrice paymentMethod paymentStatus status createdAt user recipient').lean(),

      // [16] Filtered orders for export table
      Order.find({ ...completedMatch, ...dateMatch })
        .populate('user', 'fullName phoneNumber email')
        .sort({ createdAt: -1 }).lean(),

      // [17] All active products for inventory report
      Product.find({ isActive: true }).sort({ name: 1 }).lean(),

      // [18] All non-admin users for customer report
      User.find({ isAdmin: { $ne: true }, role: { $nin: ['Admin', 'SuperAdmin', 'Super Admin'] } })
        .select('fullName email phoneNumber createdAt isBlocked').sort({ createdAt: -1 }).lean(),

      // [19] COD payment breakdown (global)
      Order.aggregate([
        { $match: { paymentMethod: 'COD' } },
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } },
      ]),
    ]);

    // ── 4. Compute results ───────────────────────────────────────────────────

    const totalRevenue   = Math.round(((filteredRevenueAgg[0]?.total) || 0) * 100) / 100;
    const totalOrders    = filteredOrderCount || 0;
    const monthlyRevenue = Math.round(((monthlyRevenueAgg[0]?.total) || 0) * 100) / 100;
    const avgOrderValue  = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

    // Order status breakdown
    const statusMap = { Pending: 0, Accepted: 0, 'Out for Delivery': 0, Delivered: 0, Cancelled: 0 };
    orderStatusAgg.forEach(s => { if (s._id && statusMap[s._id] !== undefined) statusMap[s._id] = s.count || 0; });

    // Customer analytics
    const returningCustomers = Math.max(0, (totalCustomers || 0) - (newThisMonthCount || 0));

    // Payment analytics
    const payMap = {};
    paymentAnalyticsAgg.forEach(p => { payMap[p._id] = { count: p.count || 0, revenue: p.revenue || 0 }; });
    const paymentAnalytics = {
      codTotal:     Object.values(payMap).reduce((s, v) => s + v.count, 0),
      codPending:   payMap['Pending']?.count   || 0,
      codDelivered: payMap['Delivered']?.count  || 0,
      codCancelled: payMap['Cancelled']?.count  || 0,
      codRevenue:   Math.round(((payMap['Delivered']?.revenue) || 0) * 100) / 100,
    };

    // Daily Sales — fill all 7 days (even with 0 orders)
    const dayNames   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dailyMap   = {};
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      dailyMap[key] = { name: `${dayNames[d.getDay()]} ${d.getDate()} ${monthShort[d.getMonth()]}`, orders: 0, revenue: 0 };
    }
    dailySalesAgg.forEach(d => {
      const key = `${d._id.year}-${d._id.month}-${d._id.day}`;
      if (dailyMap[key]) { dailyMap[key].orders = d.orders; dailyMap[key].revenue = Math.round((d.revenue || 0) * 100) / 100; }
    });
    const dailySales = Object.values(dailyMap).map(d => ({
      ...d, avgOrderValue: d.orders > 0 ? Math.round((d.revenue / d.orders) * 100) / 100 : 0,
    }));

    // Monthly Timeline — fill all 12 months
    const monthlyMap = {};
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()+1}`;
      monthlyMap[key] = { name: `${monthShort[d.getMonth()]} ${d.getFullYear()}`, short: monthShort[d.getMonth()], orders: 0, revenue: 0 };
    }
    monthlySalesAgg.forEach(m => {
      const key = `${m._id.year}-${m._id.month}`;
      if (monthlyMap[key]) { monthlyMap[key].orders = m.orders; monthlyMap[key].revenue = Math.round((m.revenue || 0) * 100) / 100; }
    });
    const monthlyArr  = Object.values(monthlyMap);
    const monthlySales = monthlyArr.map((m, i) => {
      const prev     = monthlyArr[i - 1];
      const growthPct = prev && prev.revenue > 0 ? Math.round(((m.revenue - prev.revenue) / prev.revenue) * 100 * 10) / 10 : 0;
      return { ...m, growthPct };
    });

    // Top 10 Products
    const topSellingProducts = topProductsAgg.map(p => ({
      name:      p.name || 'Unknown',
      tamilName: p.tamilName || '',
      category:  p.category  || 'General',
      image:     p.image     || '',
      sold:      p.sold      || 0,
      revenue:   Math.round((p.revenue || 0) * 100) / 100,
    }));

    // Category performance
    const categoryPerformance = categoryRevenueAgg.map(c => ({
      category: c._id || 'General',
      sold:     c.sold    || 0,
      revenue:  Math.round((c.revenue || 0) * 100) / 100,
    }));

    // Recent orders
    const recentOrdersFmt = recentOrders.map(o => ({
      invoiceNumber: o.invoiceNumber || o._id?.toString().slice(-6).toUpperCase(),
      customer:      o.user?.fullName  || o.recipient?.name || 'Guest',
      phone:         o.user?.phoneNumber || o.recipient?.phone || 'N/A',
      amount:        Number(o.totalPrice) || 0,
      paymentMethod: o.paymentMethod  || 'COD',
      paymentStatus: o.paymentStatus  || 'Pending',
      status:        o.status         || 'Pending',
      date:          o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'N/A',
    }));

    // Low stock / out of stock
    const lowStock   = lowStockProducts.map(p => ({ name: p.name, tamilName: p.nameTamil || '', category: p.category || '', stock: p.stock, unit: p.unit || '', status: p.stock <= 2 ? 'Critical' : 'Low' }));
    const outOfStock = outOfStockProducts.map(p => ({ name: p.name, tamilName: p.nameTamil || '', category: p.category || '', unit: p.unit || '' }));

    // ── 5. Table data for exports ────────────────────────────────────────────
    let tableData = [];
    if (reportType === 'Sales Report' || reportType === 'Revenue Report') {
      const qualified = filteredOrdersForTable.filter(o => o.paymentStatus === 'Paid' || (o.paymentMethod === 'COD' && o.status === 'Delivered'));
      tableData = qualified.map(o => ({
        'Invoice':        o.invoiceNumber || o._id?.toString().slice(-6).toUpperCase() || 'N/A',
        'Date':           o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'N/A',
        'Customer':       o.user?.fullName || o.recipient?.name || 'Guest',
        'Items':          (o.orderItems || []).reduce((a, c) => a + (Number(c.quantity) || 1), 0),
        'Payment':        o.paymentMethod || 'COD',
        'Amount':         Number(o.totalPrice) || 0,
        'Order Status':   o.status || 'Pending',
        'Payment Status': o.paymentStatus || 'Pending',
      }));
    } else if (reportType === 'Orders Report') {
      tableData = filteredOrdersForTable.map(o => ({
        'Invoice':        o.invoiceNumber || o._id?.toString().slice(-6).toUpperCase() || 'N/A',
        'Date':           o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'N/A',
        'Customer':       o.user?.fullName || o.recipient?.name || 'Guest',
        'Phone':          o.user?.phoneNumber || o.recipient?.phone || 'N/A',
        'Total':          Number(o.totalPrice) || 0,
        'Order Status':   o.status || 'Pending',
        'Payment Status': o.paymentStatus || 'Pending',
      }));
    } else if (reportType === 'Inventory Report') {
      tableData = allActiveProducts.map(p => ({
        'Product Name': p.name || 'Unnamed',
        'Tamil Name':   p.nameTamil || '',
        'Category':     p.category || 'General',
        'Price':        Number(p.price) || 0,
        'Stock':        Number(p.stock) || 0,
        'Unit':         p.unit || '',
        'Status':       p.stock === 0 ? 'Out of Stock' : p.stock <= 5 ? 'Low Stock' : 'In Stock',
      }));
    } else if (reportType === 'Customer Report') {
      tableData = allCustomers.map(u => ({
        'Name':            u.fullName || 'Anonymous',
        'Email':           u.email || 'N/A',
        'Phone':           u.phoneNumber || 'N/A',
        'Registered Date': u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : 'N/A',
        'Status':          u.isBlocked ? 'Blocked' : 'Active',
      }));
    } else if (reportType === 'Payment Report') {
      tableData = filteredOrdersForTable.map(o => ({
        'Invoice':        o.invoiceNumber || o._id?.toString().slice(-6).toUpperCase() || 'N/A',
        'Customer':       o.user?.fullName || o.recipient?.name || 'Guest',
        'Phone':          o.user?.phoneNumber || o.recipient?.phone || 'N/A',
        'Payment Method': o.paymentMethod || 'COD',
        'Amount':         Number(o.totalPrice) || 0,
        'Payment Status': o.paymentStatus || 'Pending',
        'Order Status':   o.status || 'Pending',
        'Date':           o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'N/A',
      }));
    }

    console.log(`[Reports API] OK — revenue=${totalRevenue}, orders=${totalOrders}, avgOV=${avgOrderValue}, table=${tableData.length}`);

    res.json({
      summary: { totalRevenue, totalOrders, totalCustomers, totalProducts, monthlyRevenue, pendingPayments: pendingPaymentsCount, avgOrderValue },
      orderStatusCounts: statusMap,
      customerAnalytics: { total: totalCustomers, newToday: newTodayCount, newThisMonth: newThisMonthCount, returning: returningCustomers },
      paymentAnalytics,
      charts: { dailySales, monthlySales, topSellingProducts, categoryPerformance, lowStock, outOfStock, recentOrders: recentOrdersFmt },
      tableData,
    });
  } catch (err) {
    console.error('[Reports API] Error:', err.stack || err);
    res.status(500).json({
      message: 'Server error fetching report analytics', error: err.message,
      summary: { totalRevenue: 0, totalOrders: 0, totalCustomers: 0, totalProducts: 0, monthlyRevenue: 0, pendingPayments: 0, avgOrderValue: 0 },
      orderStatusCounts: { Pending: 0, Accepted: 0, 'Out for Delivery': 0, Delivered: 0, Cancelled: 0 },
      customerAnalytics: { total: 0, newToday: 0, newThisMonth: 0, returning: 0 },
      paymentAnalytics:  { codTotal: 0, codPending: 0, codDelivered: 0, codCancelled: 0, codRevenue: 0 },
      charts: { dailySales: [], monthlySales: [], topSellingProducts: [], categoryPerformance: [], lowStock: [], outOfStock: [], recentOrders: [] },
      tableData: [],
    });
  }
});


// Consolidated search registered at the top of the file

// ─── POST /api/admin/settings/test-email ──────────────────────────────────
router.post('/settings/test-email', protectAdmin, async (req, res) => {
  const { smtpHost, smtpPort, smtpUsername, smtpPassword, senderName, senderEmail, recipientEmail } = req.body;
  if (!smtpHost || !smtpUsername || !smtpPassword || !recipientEmail) {
    return res.status(400).json({ success: false, message: 'All SMTP configurations and recipient email are required.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort) || 587,
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUsername,
        pass: smtpPassword
      }
    });

    await transporter.verify();
    
    await transporter.sendMail({
      from: `"${senderName || 'Tiruchendur Murugan'}" <${senderEmail || smtpUsername}>`,
      to: recipientEmail,
      subject: 'SMTP Configuration Test',
      text: 'This is a test email validating your new SMTP configuration settings in the Grocery Store Management Panel.'
    });

    res.json({ success: true, message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({ success: false, message: 'SMTP verification failed: ' + error.message });
  }
});

// ─── STAFF / ROLE MANAGEMENT APIS ──────────────────────────────────────────
router.get('/staff', protectAdmin, async (req, res) => {
  try {
    const staff = await Admin.find({}).select('-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/staff', protectAdmin, async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    const exists = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ message: 'Staff member email already exists.' });
    }

    const newStaff = await Admin.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role,
      permissions: permissions || {
        products: true,
        orders: true,
        reports: true,
        settings: true,
        users: true,
        notifications: true
      }
    });

    const staffObj = newStaff.toObject();
    delete staffObj.password;

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Create Staff',
      targetType: 'User',
      targetId: String(newStaff._id),
      targetName: newStaff.name,
      newValue: { role: newStaff.role }
    });

    res.status(201).json(staffObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.put('/staff/:id', protectAdmin, async (req, res) => {
  try {
    const { name, email, role, permissions, password } = req.body;
    const staff = await Admin.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    // Keep email unique
    if (email && email.toLowerCase().trim() !== staff.email) {
      const emailExists = await Admin.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) {
        return res.status(409).json({ message: 'Email already in use.' });
      }
      staff.email = email.toLowerCase().trim();
    }

    if (name) staff.name = name;
    if (role) staff.role = role;
    if (permissions) staff.permissions = permissions;
    if (password && password.trim() !== '') {
      staff.password = password;
    }

    await staff.save();
    const staffObj = staff.toObject();
    delete staffObj.password;

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Update Staff Info',
      targetType: 'User',
      targetId: String(staff._id),
      targetName: staff.name,
      newValue: { role: staff.role }
    });

    res.json(staffObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.delete('/staff/:id', protectAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (id === String(req.admin._id)) {
      return res.status(400).json({ message: 'You cannot delete your own administrative account.' });
    }
    const staff = await Admin.findById(id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    if (staff.role === 'Super Admin' || staff.role === 'SuperAdmin') {
      return res.status(403).json({ message: 'Super Admin account cannot be deleted.' });
    }

    await Admin.findByIdAndDelete(id);

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Delete Staff',
      targetType: 'User',
      targetId: String(id),
      targetName: staff.name,
      oldValue: { role: staff.role }
    });

    res.json({ message: 'Staff member deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DATABASE CONTROLLER & BACKUP APIS ──────────────────────────────────────
router.get('/database/status', protectAdmin, async (req, res) => {
  try {
    const counts = {
      users: await User.countDocuments(),
      orders: await Order.countDocuments(),
      products: await Product.countDocuments(),
      categories: await Category.countDocuments(),
      notifications: await Notification.countDocuments(),
      auditLogs: await AuditLog.countDocuments()
    };

    let dbSize = 'Unknown';
    let dbStatus = 'Disconnected';
    if (mongoose.connection.readyState === 1) {
      dbStatus = 'Connected';
      try {
        const stats = await mongoose.connection.db.stats();
        dbSize = (stats.dataSize / (1024 * 1024)).toFixed(2) + ' MB';
      } catch (err) {
        dbSize = 'Unavailable (Atlas / Privileges restriction)';
      }
    }

    res.json({
      status: dbStatus,
      size: dbSize,
      counts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.post('/database/backup', protectAdmin, async (req, res) => {
  try {
    const backupDir = 'uploads/backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const collections = {
      users: await User.find({}).lean(),
      orders: await Order.find({}).lean(),
      products: await Product.find({}).lean(),
      categories: await Category.find({}).lean(),
      notifications: await Notification.find({}).lean(),
      admins: await Admin.find({}).lean(),
      auditlogs: await AuditLog.find({}).lean(),
      storesettings: await StoreSettings.find({}).lean(),
      calendarevents: await CalendarEvent.find({}).lean()
    };

    const payload = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      collections
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf-8');

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Create Database Backup',
      targetType: 'System',
      targetName: filename
    });

    res.json({ success: true, message: 'Database backup created successfully', filename });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ message: 'Database backup failed: ' + error.message });
  }
});

router.get('/database/backups', protectAdmin, async (req, res) => {
  try {
    const backupDir = 'uploads/backups';
    if (!fs.existsSync(backupDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(filename => {
        const stats = fs.statSync(path.join(backupDir, filename));
        return {
          filename,
          size: (stats.size / 1024).toFixed(2) + ' KB',
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json(files);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve backups list' });
  }
});

router.get('/database/backups/download/:filename', protectAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.resolve('uploads/backups', filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'Backup file not found' });
    }
    res.download(filepath);
  } catch (error) {
    res.status(500).json({ message: 'Download failed' });
  }
});

const executeRestore = async (backupPayload) => {
  const collections = backupPayload.collections;
  if (!collections) throw new Error('Invalid backup file structure: missing collections.');

  // Delete all and insert
  if (collections.storesettings && collections.storesettings.length > 0) {
    await StoreSettings.deleteMany({});
    await StoreSettings.insertMany(collections.storesettings);
  }
  if (collections.categories && collections.categories.length > 0) {
    await Category.deleteMany({});
    await Category.insertMany(collections.categories);
  }
  if (collections.products && collections.products.length > 0) {
    await Product.deleteMany({});
    await Product.insertMany(collections.products);
  }
  if (collections.users && collections.users.length > 0) {
    await User.deleteMany({});
    await User.insertMany(collections.users);
  }
  if (collections.orders && collections.orders.length > 0) {
    await Order.deleteMany({});
    await Order.insertMany(collections.orders);
  }
  if (collections.notifications && collections.notifications.length > 0) {
    await Notification.deleteMany({});
    await Notification.insertMany(collections.notifications);
  }
  if (collections.admins && collections.admins.length > 0) {
    await Admin.deleteMany({});
    await Admin.insertMany(collections.admins);
  }
  if (collections.calendarevents && collections.calendarevents.length > 0) {
    await CalendarEvent.deleteMany({});
    await CalendarEvent.insertMany(collections.calendarevents);
  }
  if (collections.auditlogs && collections.auditlogs.length > 0) {
    await AuditLog.deleteMany({});
    await AuditLog.insertMany(collections.auditlogs);
  }
};

router.post('/database/backups/restore/:filename', protectAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.resolve('uploads/backups', filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'Backup file not found' });
    }

    const fileContent = fs.readFileSync(filepath, 'utf-8');
    const backupPayload = JSON.parse(fileContent);

    await executeRestore(backupPayload);

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Restore Database Backup',
      targetType: 'System',
      targetName: filename
    });

    res.json({ success: true, message: 'Database restored successfully' });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ message: 'Restore failed: ' + error.message });
  }
});

router.post('/database/backups/upload-restore', protectAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file uploaded.' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const backupPayload = JSON.parse(fileContent);

    await executeRestore(backupPayload);

    // Remove temp uploaded file
    fs.unlinkSync(req.file.path);

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Upload & Restore Backup File',
      targetType: 'System',
      targetName: req.file.originalname
    });

    res.json({ success: true, message: 'Database restored from uploaded file successfully' });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Upload restore error:', error);
    res.status(500).json({ message: 'Restore from uploaded file failed: ' + error.message });
  }
});

router.post('/database/database-import', protectAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No import file uploaded.' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const importData = JSON.parse(fileContent);

    const collections = importData.collections || importData;
    let importCount = 0;

    // Upsert items from each collection
    const modelsMap = {
      users: User,
      products: Product,
      categories: Category,
      orders: Order,
      admins: Admin,
      calendarevents: CalendarEvent,
      auditlogs: AuditLog
    };

    for (const [key, model] of Object.entries(modelsMap)) {
      const docs = collections[key];
      if (docs && Array.isArray(docs)) {
        for (const doc of docs) {
          if (doc._id) {
            await model.findByIdAndUpdate(doc._id, doc, { upsert: true });
            importCount++;
          }
        }
      }
    }

    fs.unlinkSync(req.file.path);

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Import Database Records',
      targetType: 'System',
      targetName: req.file.originalname,
      newValue: { count: importCount }
    });

    res.json({ success: true, message: `Imported ${importCount} records successfully.` });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Database import failed: ' + error.message });
  }
});

router.post('/database/optimize', protectAdmin, async (req, res) => {
  try {
    const details = [];

    // 1. Clean expired Otp/Verification entries in user profiles
    const cleanExpiredOtps = await User.updateMany(
      { $or: [ { emailOtpExpires: { $lt: new Date() } }, { verificationOTPExpires: { $lt: new Date() } } ] },
      { $unset: { emailOtp: "", emailVerificationOTP: "", otp: "", verificationOTP: "" } }
    );
    details.push(`Cleaned up expired OTPs for ${cleanExpiredOtps.modifiedCount} accounts.`);

    // 2. Clean expired PasswordReset requests
    const cleanPassResets = await PasswordReset.deleteMany({ expires: { $lt: new Date() } });
    details.push(`Removed ${cleanPassResets.deletedCount} expired password reset entries.`);

    // 3. Compact databases if supported
    try {
      // Re-index Category and Product to optimize searches
      await Category.syncIndexes();
      await Product.syncIndexes();
      details.push('Rebuilt database indexes and synchronized unique constraint constraints.');
    } catch (dbErr) {
      details.push('Indexing step failed: ' + dbErr.message);
    }

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Optimize Database',
      targetType: 'System',
      newValue: details
    });

    res.json({ success: true, message: 'Database optimized successfully.', details });
  } catch (error) {
    res.status(500).json({ message: 'Optimization failed: ' + error.message });
  }
});

// ─── BULK PRODUCT ADDITIONS (MATCHING IMAGES, IMPORT/EXPORT) ───────────────
router.post('/products/bulk-image-upload', protectAdmin, upload.array('images', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded.' });
    }

    const matches = [];
    const unmatched = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname);
      const nameWithoutExt = path.basename(file.originalname, ext).trim();

      // Find product matching name, sku, or englishName
      const regex = new RegExp(`^${nameWithoutExt}$`, 'i');
      const product = await Product.findOne({
        $or: [
          { sku: nameWithoutExt },
          { name: regex },
          { englishName: regex }
        ]
      });

      if (product) {
        const imagePath = `/uploads/${file.filename}`;
        product.image = imagePath;
        if (!product.images.includes(imagePath)) {
          product.images.push(imagePath);
        }
        await product.save();
        matches.push({ filename: file.originalname, productName: product.name });

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('product_update', product);
      } else {
        unmatched.push(file.originalname);
      }
    }

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Bulk Image Upload',
      targetType: 'Product',
      newValue: { matchesCount: matches.length, unmatchedCount: unmatched.length }
    });

    res.json({
      success: true,
      message: `Processed ${req.files.length} images. ${matches.length} matched, ${unmatched.length} unmatched.`,
      matches,
      unmatched
    });
  } catch (error) {
    console.error('Bulk image matching failed:', error);
    res.status(500).json({ message: 'Bulk image processing failed: ' + error.message });
  }
});

router.post('/products/import', protectAdmin, async (req, res) => {
  try {
    const products = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ message: 'Payload must be a JSON array of products.' });
    }

    let imported = 0;
    for (const item of products) {
      if (!item.name || !item.price || !item.category) continue;
      
      // Upsert based on name + category matching
      await Product.findOneAndUpdate(
        { name: item.name, category: item.category },
        { ...item, inStock: (item.stock || 0) > 0 },
        { upsert: true, new: true }
      );
      imported++;
    }

    // Broadcast full product update
    const io = req.app.get('io');
    if (io) {
      const allProds = await Product.find({});
      io.emit('products_reload', allProds);
    }

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Import Products Catalog',
      targetType: 'Product',
      newValue: { count: imported }
    });

    res.json({ success: true, message: `Imported ${imported} products successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Catalog import failed: ' + error.message });
  }
});

router.get('/products/export', protectAdmin, async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Catalog export failed' });
  }
});

// ─── CATEGORY REORDERING ───────────────────────────────────────────────────
router.post('/categories/reorder', protectAdmin, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ message: 'Orders array is required.' });
    }

    for (const item of orders) {
      await Category.findByIdAndUpdate(item.id, { displayOrder: Number(item.displayOrder) });
    }

    const io = req.app.get('io');
    if (io) {
      const updatedCategories = await Category.find({ isActive: { $ne: false } }).sort({ displayOrder: 1, createdAt: -1 });
      io.emit('categories_reordered', updatedCategories);
    }

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Reorder Categories',
      targetType: 'Category'
    });

    res.json({ success: true, message: 'Categories reordered successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Reordering failed' });
  }
});

// ─── SYSTEM / AUDIT LOGS ───────────────────────────────────────────────────
router.get('/system-logs', protectAdmin, async (req, res) => {
  try {
    const { type, search, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query = {};
    
    // Type Filter
    if (type && type !== 'all') {
      if (type === 'admin-login') {
        query.action = 'Admin Login';
      } else if (type === 'customer-login') {
        query.action = 'Customer Login';
      } else if (type === 'order') {
        query.targetType = 'Order';
      } else if (type === 'product') {
        query.targetType = { $in: ['Product', 'Price', 'Stock'] };
      } else if (type === 'category') {
        query.targetType = 'Category';
      } else if (type === 'error') {
        query.action = { $regex: 'Error', $options: 'i' };
      }
    }

    // Keyword Search
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { adminName: regex },
        { action: regex },
        { targetName: regex }
      ];
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── CUSTOMER USER MANAGEMENT EDITS ───────────────────────────────────────
router.put('/users/:id', protectAdmin, async (req, res) => {
  try {
    const { fullName, email, phoneNumber } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) return res.status(409).json({ message: 'Email address already in use.' });
      user.email = email.toLowerCase().trim();
    }

    if (phoneNumber && phoneNumber.trim() !== user.phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber: phoneNumber.trim() });
      if (phoneExists) return res.status(409).json({ message: 'Phone number already in use.' });
      user.phoneNumber = phoneNumber.trim();
    }

    if (fullName) user.fullName = fullName;

    await user.save();
    
    const userObj = user.toObject();
    delete userObj.password;

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Edit Customer Profile',
      targetType: 'User',
      targetId: String(user._id),
      targetName: user.fullName,
      newValue: { email: user.email, phone: user.phoneNumber }
    });

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.patch('/users/:id/suspend', protectAdmin, async (req, res) => {
  try {
    const { suspendUntil } = req.body; // Date string or null
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    user.suspendedUntil = suspendUntil ? new Date(suspendUntil) : null;
    await user.save();

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: suspendUntil ? 'Suspend Customer' : 'Unsuspend Customer',
      targetType: 'User',
      targetId: String(user._id),
      targetName: user.fullName,
      newValue: { suspendedUntil: user.suspendedUntil }
    });

    res.json({ message: `Customer account ${suspendUntil ? 'suspended' : 'unsuspended'} successfully.`, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.post('/users/:id/reset-password', protectAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.trim() === '') {
      return res.status(400).json({ message: 'Password is required.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    user.password = password;
    await user.save();

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await AuditLog.create({
      adminName,
      action: 'Reset Customer Password',
      targetType: 'User',
      targetId: String(user._id),
      targetName: user.fullName
    });

    res.json({ message: 'Customer password updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
