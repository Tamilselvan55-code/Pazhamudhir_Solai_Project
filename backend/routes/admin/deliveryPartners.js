import express from 'express';
import {
  getDeliveryPartners,
  createDeliveryPartner,
  updateDeliveryPartner,
  resetPassword
} from '../../controllers/admin/deliveryPartnerController.js';

const router = express.Router();

router.route('/delivery-partners')
  .get(getDeliveryPartners)
  .post(createDeliveryPartner);

router.route('/delivery-partners/:id')
  .put(updateDeliveryPartner);

router.put('/delivery-partners/:id/reset-password', resetPassword);

export default router;
