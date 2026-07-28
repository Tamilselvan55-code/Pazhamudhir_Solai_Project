import express from 'express';
import {
  getDeliveryPartners,
  createDeliveryPartner,
  updateDeliveryPartner,
  resetPassword,
  getDeliveryAnalytics,
  getAllDeliveryEarnings,
  paySettlement,
  verifyDeliveryPartnerDocument
} from '../../controllers/admin/deliveryPartnerController.js';

const router = express.Router();

router.get('/delivery-partners/analytics', getDeliveryAnalytics);

// Phase 17: Admin Earnings
router.get('/delivery-earnings', getAllDeliveryEarnings);
router.post('/delivery-earnings/:id/settle', paySettlement);

router.route('/delivery-partners')
  .get(getDeliveryPartners)
  .post(createDeliveryPartner);

router.route('/delivery-partners/:id')
  .put(updateDeliveryPartner);

router.put('/delivery-partners/:id/reset-password', resetPassword);
router.post('/delivery-partners/:id/verify', verifyDeliveryPartnerDocument);

export default router;
