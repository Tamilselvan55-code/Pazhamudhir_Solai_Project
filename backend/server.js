import express from 'express';
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
import prisma from './utils/prismaClient.js';
import bcrypt from 'bcryptjs';
import { formatMongoCompat } from './utils/formatMongoCompat.js';
import jwt from 'jsonwebtoken';
import { migrateTamilNames } from './utils/migrateTamilNames.js';
import { ensureDefaultCategories } from './utils/seedDefaultCategories.js';
import userNotificationRoutes from './routes/userNotificationRoutes.js';

dotenv.config();

const app = express();

const allowedOrigins = [
  'https://pazhamudhir-solai-project.vercel.app',
  'https://pazhamudhir-solai-project-m60pthbev.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.replace(/\/+$/, '')] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy error: Origin ${origin} not allowed.`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));
app.use(express.json());

// Global response interceptor to dynamically replace hardcoded localhost backend URLs for images
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const dynamicBackendUrl = `${protocol}://${host}`;
      
      let str = JSON.stringify(body);
      if (str.includes('http://localhost:5000')) {
        str = str.replace(/http:\/\/localhost:5000/g, dynamicBackendUrl);
        body = JSON.parse(str);
      }
    }
    return originalJson.call(this, body);
  };
  next();
});

app.use('/uploads', express.static('uploads')); // For any uploaded images

// Database connection via Prisma
prisma.$connect()
  .then(async () => {
    console.log('Connected to PostgreSQL via Prisma');
    try {
      await migrateTamilNames();
      await ensureDefaultCategories();
    } catch (migErr) {
      console.error('[Migration Error]:', migErr);
    }
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'thiruchendurmurugan192@gmail.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      let admin = await prisma.admin.findFirst({ where: { role: 'Super Admin' } });
      if (!admin) {
        admin = await prisma.admin.findUnique({ where: { email: adminEmail } });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      if (admin) {
        await prisma.admin.update({
          where: { id: admin.id },
          data: { email: adminEmail, password: hashedPassword }
        });
        console.log('[Seed] Super Admin credentials updated successfully.');
      } else {
        await prisma.admin.create({
          data: { name: 'Super Admin', email: adminEmail, password: hashedPassword, role: 'Super Admin' }
        });
        console.log('[Seed] Super Admin created successfully.');
      }
    } catch (err) {
      console.error('[Seed Error] Failed to update Super Admin:', err);
    }
  })
  .catch((err) => console.error('Prisma connection error:', err));

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
    const categoriesRaw = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }]
    });
    res.json(formatMongoCompat(categoriesRaw));
  } catch (err) {
    console.error('Fetch public categories error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching categories',
      error: err.message || String(err),
      stack: err.stack
    });
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
    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
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
    const { promisify } = require('util');
    const dns = require('dns');
    const resolve4 = promisify(dns.resolve4);
    
    let hostIp = 'smtp.gmail.com';
    try {
      const ips = await resolve4('smtp.gmail.com');
      if (ips && ips.length > 0) {
        hostIp = ips[0];
      }
    } catch (e) {
      console.error('[SMTP DNS ERROR] server test-email', e);
    }

    const transporter = nodemailer.createTransport({
      host: hostIp,
      port: 465,
      secure: true,
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      dnsTimeout: 10000,
      tls: {
        servername: 'smtp.gmail.com'
      },
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
      subject: 'Pazhamudhir Solai Email Service Test',
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
