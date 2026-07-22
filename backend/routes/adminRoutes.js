import express from 'express';
import { protectAdmin } from '../middleware/adminAuth.js';

import dashboardRouter from './admin/dashboard.js';
import productsRouter from './admin/products.js';
import usersRouter from './admin/users.js';
import calendarRouter from './admin/calendar.js';
import searchRouter from './admin/search.js';
import ordersRouter from './admin/orders.js';
import categoriesRouter from './admin/categories.js';
import offersRouter from './admin/offers.js';
import settingsRouter from './admin/settings.js';
import paymentsRouter from './admin/payments.js';
import notificationsRouter from './admin/notifications.js';
import staffRouter from './admin/staff.js';
import databaseRouter from './admin/database.js';
import systemLogsRouter from './admin/systemLogs.js';
import uploadRouter from './admin/upload.js';
import reportsRouter from './admin/reports.js';

const router = express.Router();

// Apply admin protection middleware globally to all admin routes
router.use(protectAdmin);

router.use(dashboardRouter);
router.use(productsRouter);
router.use(usersRouter);
router.use(calendarRouter);
router.use(searchRouter);
router.use(ordersRouter);
router.use(categoriesRouter);
router.use(offersRouter);
router.use(settingsRouter);
router.use(paymentsRouter);
router.use(notificationsRouter);
router.use(staffRouter);
router.use(databaseRouter);
router.use(systemLogsRouter);
router.use(uploadRouter);
router.use(reportsRouter);

export default router;
