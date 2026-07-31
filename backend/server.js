import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import prisma from './utils/prismaClient.js';
import bcrypt from 'bcryptjs';
import { sendEmail } from './utils/emailService.js';
import { formatMongoCompat } from './utils/formatMongoCompat.js';
import jwt from 'jsonwebtoken';
import { migrateTamilNames } from './utils/migrateTamilNames.js';
import { ensureDefaultCategories } from './utils/seedDefaultCategories.js';
import userNotificationRoutes from './routes/userNotificationRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';

dotenv.config();

const app = express();

// Apply security headers with Helmet
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "blob:", "*"],
    connectSrc: ["'self'", "ws:", "wss:", "*"],
    workerSrc: ["'self'", "blob:"],
  },
}));

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

// Prevent caching for local uploads
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
})); // For any uploaded images

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

// Prevent caching for all API responses
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/location', locationRoutes);
app.use('/api', userNotificationRoutes);
app.use('/api/delivery', deliveryRoutes);

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
      message: 'Server error fetching categories'
    });
  }
});

// Endpoint to generate a short-lived token for invoice download
app.get('/api/orders/:id/invoice-token', async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
    
    // Verify user/admin
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } }) || await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(403).json({ message: 'Forbidden' });

    // Generate a short-lived 5 minute token
    const downloadToken = jwt.sign({ orderId: req.params.id, userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' });
    res.json({ success: true, downloadToken });
  } catch (error) {
    res.status(403).json({ message: 'Forbidden: Access denied' });
  }
});

// Protected invoice download route
app.get('/api/invoice/download/:id', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.orderId !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden: Invalid token for this order' });
    }
    // Logic for actual PDF generation would happen here. For now, returning success.
    res.json({ success: true, message: 'Authorized to download invoice', orderId: req.params.id });
  } catch (error) {
    return res.status(403).json({ message: 'Forbidden: Access denied or token expired' });
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
    console.log('[EMAIL TEST] Sending Email via Brevo');

    await sendEmail({
      to: email,
      subject: 'Pazhamudhir Solai Email Service Test',
      text: `Hello,\n\nThis is a test email from the Tiruchendur Murugan Pazhamudhir Solai website.\n\nIf you received this email, Brevo API configuration is working correctly.\n\nThank you,\nTiruchendur Murugan Pazhamudhir Solai Team.`,
      html: `Hello,<br><br>This is a test email from the Tiruchendur Murugan Pazhamudhir Solai website.<br><br>If you received this email, Brevo API configuration is working correctly.<br><br>Thank you,<br>Tiruchendur Murugan Pazhamudhir Solai Team.`
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

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow socket connections but log suspicious ones
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Connected client: ${socket.id}`);
  
  socket.on('join', async (data) => {
    try {
      if (!data.token) {
        console.warn(`[Socket.io] Blocked unauthorized join from ${socket.id} (no token)`);
        return;
      }
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET);

      if (data.role === 'admin') {
        const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
        if (admin) {
          socket.join('admin');
          console.log(`[Socket.io] Client joined admin room: ${socket.id}`);
        }
      } else if (data.userId) {
        if (decoded.id === data.userId) {
          const room = `user:${data.userId}`;
          socket.join(room);
          console.log(`[Socket.io] Client joined room ${room}: ${socket.id}`);
        }
      } else if (data.role === 'delivery' || data.partnerId) {
        const partner = await prisma.deliveryPartner.findUnique({ where: { id: decoded.id } });
        if (partner && partner.isActive) {
          socket.join('delivery');
          if (data.partnerId) {
            socket.join(`delivery:${data.partnerId}`);
          }
          console.log(`[Socket.io] Client joined delivery room: ${socket.id}`);
        }
      }
    } catch (err) {
      console.error('[Socket.io] Unauthorized join attempt:', err.message);
    }
  });

  socket.on('update_delivery_location', (data) => {
    io.emit('partner_location_changed', data);
    if (data?.orderId) {
      io.emit(`order_location_${data.orderId}`, data);
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
