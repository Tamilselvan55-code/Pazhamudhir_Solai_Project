import express from 'express';
import {
  loginDeliveryPartner,
  getDeliveryProfile,
  updateDeliveryProfile,
  updateDeliveryPassword,
  logoutDeliveryPartner,
  getDeliveryPartnerAnalytics,
  updateDeliveryLocation,
  getDeliveryEarnings,
  getDeliveryDocuments,
  uploadDeliveryDocuments,
  getDeliveryNotifications,
  markDeliveryNotificationRead,
  markAllDeliveryNotificationsRead
} from '../controllers/deliveryController.js';
import { getAssignedOrders, updateOrderStatus, rejectOrder, verifyDeliveryOtp } from '../controllers/deliveryOrdersController.js';
import { protectDelivery } from '../middleware/deliveryAuthMiddleware.js';

const router = express.Router();

router.post('/login', loginDeliveryPartner);
router.post('/logout', protectDelivery, logoutDeliveryPartner);
router.post('/location', protectDelivery, updateDeliveryLocation);
router.route('/profile')
  .get(protectDelivery, getDeliveryProfile)
  .put(protectDelivery, updateDeliveryProfile);

router.put('/profile/password', protectDelivery, updateDeliveryPassword);

router.get('/analytics', protectDelivery, getDeliveryPartnerAnalytics);
router.get('/earnings', protectDelivery, getDeliveryEarnings);

router.route('/documents')
  .get(protectDelivery, getDeliveryDocuments)
  .post(protectDelivery, uploadDeliveryDocuments);

router.get('/orders', protectDelivery, getAssignedOrders);
router.patch('/orders/:id/status', protectDelivery, updateOrderStatus);
router.post('/orders/:id/reject', protectDelivery, rejectOrder);

// Phase 14: Delivery OTP Verification
router.post('/orders/:id/verify-otp', protectDelivery, verifyDeliveryOtp);

// Notifications
router.get('/notifications', protectDelivery, getDeliveryNotifications);
router.put('/notifications/read-all', protectDelivery, markAllDeliveryNotificationsRead);
router.put('/notifications/:id/read', protectDelivery, markDeliveryNotificationRead);

export default router;

