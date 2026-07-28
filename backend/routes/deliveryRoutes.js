import express from 'express';
import {
  loginDeliveryPartner,
  getDeliveryProfile,
  updateDeliveryProfile,
  updateDeliveryPassword,
  logoutDeliveryPartner,
  getDeliveryPartnerAnalytics,
} from '../controllers/deliveryController.js';
import { getAssignedOrders, updateOrderStatus, rejectOrder } from '../controllers/deliveryOrdersController.js';
import { protectDelivery } from '../middleware/deliveryAuthMiddleware.js';

const router = express.Router();

router.post('/login', loginDeliveryPartner);
router.post('/logout', protectDelivery, logoutDeliveryPartner);
router.route('/profile')
  .get(protectDelivery, getDeliveryProfile)
  .put(protectDelivery, updateDeliveryProfile);

router.put('/profile/password', protectDelivery, updateDeliveryPassword);

router.get('/analytics', protectDelivery, getDeliveryPartnerAnalytics);

router.get('/orders', protectDelivery, getAssignedOrders);
router.patch('/orders/:id/status', protectDelivery, updateOrderStatus);
router.post('/orders/:id/reject', protectDelivery, rejectOrder);

export default router;
