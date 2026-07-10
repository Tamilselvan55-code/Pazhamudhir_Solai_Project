import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';
import { createAndEmitNotification } from '../../utils/notificationHelper.js';

const router = express.Router();

const logAuditAndEmit = async (req, action, targetType, targetId, targetName, oldValue, newValue, eventName, eventData) => {
  try {
    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action,
        targetType,
        targetId: String(targetId || ''),
        targetName: String(targetName || ''),
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null
      }
    });
    const io = req.app.get('io');
    if (io && eventName) {
      io.emit(eventName, eventData);
    }
  } catch (err) {
    console.error('AuditLog helper error:', err);
  }
};

router.get('/offers', async (req, res) => {
  try {
    const offersRaw = await prisma.offer.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(formatMongoCompatArray(offersRaw));
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

router.post('/offers', async (req, res) => {
  try {
    const validationError = validateOfferPayload(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    
    const offerData = { ...req.body };
    offerData.discountPercentage = Number(offerData.discountPercentage);
    offerData.minOrderValue = Number(offerData.minOrderValue);
    if (offerData.maxDiscountAmount) offerData.maxDiscountAmount = Number(offerData.maxDiscountAmount);
    offerData.validFrom = new Date(offerData.validFrom);
    offerData.validUntil = new Date(offerData.validUntil);
    offerData.isActive = offerData.isActive !== false && offerData.isActive !== 'false';
    offerData.status = offerData.status || 'Active';

    const offerRaw = await prisma.offer.create({ data: offerData });
    const offer = formatMongoCompat(offerRaw);

    await logAuditAndEmit(req, 'Create Offer', 'Offer', offer._id, offer.title, null, JSON.stringify(offer), 'offer_update', offer);

    (async () => {
      try {
        const users = await prisma.user.findMany({ where: { isBlocked: { not: true } }, select: { id: true } });
        const io = req.app.get('io');
        for (const user of users) {
          await createAndEmitNotification(io, {
            userId: user.id,
            title: `New Offer: ${offer.title}`,
            message: offer.description || `Get ${offer.discountPercentage || 0}% off!`,
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
    res.status(400).json({ message: 'Server failed while saving offer.', error: err.message });
  }
});

router.put('/offers/:id', async (req, res) => {
  try {
    const validationError = validateOfferPayload(req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const oldOfferRaw = await prisma.offer.findUnique({ where: { id: req.params.id } });
    if (!oldOfferRaw) return res.status(404).json({ message: 'Offer not found' });
    const oldOffer = formatMongoCompat(oldOfferRaw);

    const offerData = { ...req.body };
    delete offerData._id;
    delete offerData.id;
    delete offerData.createdAt;
    delete offerData.updatedAt;
    
    if (offerData.discountPercentage !== undefined) offerData.discountPercentage = Number(offerData.discountPercentage);
    if (offerData.minOrderValue !== undefined) offerData.minOrderValue = Number(offerData.minOrderValue);
    if (offerData.maxDiscountAmount !== undefined) offerData.maxDiscountAmount = Number(offerData.maxDiscountAmount);
    if (offerData.validFrom) offerData.validFrom = new Date(offerData.validFrom);
    if (offerData.validUntil) offerData.validUntil = new Date(offerData.validUntil);
    if (offerData.isActive !== undefined) offerData.isActive = offerData.isActive === true || offerData.isActive === 'true';

    const offerRaw = await prisma.offer.update({ where: { id: req.params.id }, data: offerData });
    const offer = formatMongoCompat(offerRaw);

    await logAuditAndEmit(req, 'Edit Offer', 'Offer', offer._id, offer.title, JSON.stringify(oldOffer), JSON.stringify(offer), 'offer_update', offer);
    res.json(offer);
  } catch (err) {
    res.status(400).json({ message: 'Server failed while updating offer.', error: err.message });
  }
});

router.delete('/offers/:id', async (req, res) => {
  try {
    const oldOfferRaw = await prisma.offer.findUnique({ where: { id: req.params.id } });
    await prisma.offer.delete({ where: { id: req.params.id } });
    if (oldOfferRaw) {
      const oldOffer = formatMongoCompat(oldOfferRaw);
      await logAuditAndEmit(req, 'Delete Offer', 'Offer', oldOffer._id, oldOffer.title, JSON.stringify(oldOffer), null, 'offer_update', { _id: req.params.id, deleted: true });
    }
    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    console.error('Delete offer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/offers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const oldOfferRaw = await prisma.offer.findUnique({ where: { id: req.params.id } });
    const offerRaw = await prisma.offer.update({
      where: { id: req.params.id },
      data: { status, isActive: status === 'Active' }
    });
    const offer = formatMongoCompat(offerRaw);
    await logAuditAndEmit(req, 'Toggle Offer Status', 'Offer', offer._id, offer.title, oldOfferRaw.status, status, 'offer_update', offer);
    res.json(offer);
  } catch (err) {
    console.error('Patch offer status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
