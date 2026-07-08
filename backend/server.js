import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import Admin from './models/Admin.js';
import Category from './models/Category.js';
import jwt from 'jsonwebtoken';
import { migrateTamilNames } from './utils/migrateTamilNames.js';
import { ensureDefaultCategories } from './utils/seedDefaultCategories.js';
import userNotificationRoutes from './routes/userNotificationRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // For any uploaded images

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tiruchendur_grocery';
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    try {
      await migrateTamilNames();
      await ensureDefaultCategories();
    } catch (migErr) {
      console.error('[Migration Error]:', migErr);
    }
    try {
      // Auto-update/seed admin with user's requested credentials
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      let admin = await Admin.findOne({ role: 'Super Admin' });
      if (!admin) {
        admin = await Admin.findOne({ email: 'thiruchendurmurugan192@gmail.com' });
      }
      if (admin) {
        admin.email = 'thiruchendurmurugan192@gmail.com';
        admin.password = adminPassword;
        await admin.save();
        console.log('[Seed] Super Admin credentials updated successfully.');
      } else {
        await Admin.create({
          name: 'Super Admin',
          email: 'thiruchendurmurugan192@gmail.com',
          password: adminPassword,
          role: 'Super Admin'
        });
        console.log('[Seed] Super Admin created successfully.');
      }
    } catch (err) {
      console.error('[Seed Error] Failed to update Super Admin:', err);
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/location', locationRoutes);
app.use('/api', userNotificationRoutes);

// Public categories endpoint
app.get('/api/categories', async (req, res) => {
  try {
    await ensureDefaultCategories();
    const categories = await Category.find({ isActive: { $ne: false } }).sort({ displayOrder: 1, createdAt: -1 });
    res.json(categories);
  } catch (err) {
    console.error('Fetch public categories error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected invoice download route
app.get('/api/invoice/download/:id', async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(403).json({ message: 'Forbidden: Only admins can download invoice PDFs' });
    }
    res.json({ success: true, message: 'Admin authorized to download invoice' });
  } catch (error) {
    return res.status(403).json({ message: 'Forbidden: Access denied' });
  }
});

// Root level diagnostics route for test-email
app.post('/test-email', async (req, res) => {
  console.log('[EMAIL TEST] Starting');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    const errorMsg = 'Gmail SMTP credentials are not configured.';
    console.error(`[EMAIL TEST ERROR] ${errorMsg}`);
    return res.status(400).json({
      success: false,
      message: errorMsg,
      error: errorMsg
    });
  }

  const { email } = req.body || {};
  if (!email) {
    const errorMsg = 'Recipient email is required.';
    console.error(`[EMAIL TEST ERROR] ${errorMsg}`);
    return res.status(400).json({
      success: false,
      message: 'Unable to send email.',
      error: errorMsg
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.verify();
    console.log('[EMAIL TEST] SMTP Connected');

    console.log('[EMAIL TEST] Sending Email');

    await transporter.sendMail({
      from: `"Tiruchendur Murugan Pazhamudhir Solai" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Palumanicholai Email Service Test',
      text: `Hello,\n\nThis is a test email from the Tiruchendur Murugan Pazhamudhir Solai website.\n\nIf you received this email, Gmail SMTP configuration is working correctly.\n\nThank you,\nTiruchendur Murugan Pazhamudhir Solai Team.`
    });

    console.log('[EMAIL TEST] Email Sent Successfully');

    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully.'
    });
  } catch (error) {
    const fullError = error.message || String(error);
    console.error(`[EMAIL TEST ERROR] ${fullError}`);
    return res.status(500).json({
      success: false,
      message: 'Unable to send email.',
      error: fullError
    });
  }
});

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Connected client: ${socket.id}`);
  
  socket.on('join', (data) => {
    if (data.role === 'admin') {
      socket.join('admin');
      console.log(`[Socket.io] Client joined admin room: ${socket.id}`);
    } else if (data.userId) {
      const room = `user:${data.userId}`;
      socket.join(room);
      console.log(`[Socket.io] Client joined room ${room}: ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Disconnected client: ${socket.id}`);
  });
});

app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌱 Tiruchendur Murugan Pazhamudhir Solai Server 🌱`);
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`====================================================`);
});
