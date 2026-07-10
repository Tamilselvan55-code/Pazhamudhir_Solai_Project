import express from 'express';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';
import { isWithinDeliveryRadius } from '../utils/distance.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/verify', async (req, res) => {
  const { lat, lon } = req.body;

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ message: 'lat and lon must be numbers.' });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ message: 'Coordinates out of valid range.' });
  }

  try {
    const settingsRaw = await prisma.storeSettings.findFirst();
    const settings = formatMongoCompat(settingsRaw) || {
      location:         { lat: 13.005865, lon: 79.995026 },
      deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 30,
    };

    const result = isWithinDeliveryRadius(
      lat, lon,
      settings.location?.lat ?? 13.005865,
      settings.location?.lon ?? 79.995026,
      settings.deliveryRadiusKm ?? 30
    );

    return res.json({
      lat,
      lon,
      distanceKm:        result.distance,
      deliveryAvailable: result.isEligible,
      radiusKm:          settings.deliveryRadiusKm ?? 30,
      storeLat:          settings.location?.lat ?? 13.005865,
      storeLon:          settings.location?.lon ?? 79.995026,
      message:           result.isEligible
        ? 'Delivery available at your location.'
        : `Sorry, delivery is available only within ${settings.deliveryRadiusKm ?? 30} km of the store.`,
    });
  } catch (error) {
    console.error('Location verify error:', error.message);
    res.status(500).json({ message: 'Server error during location verification.' });
  }
});

router.post('/save', protect, async (req, res) => {
  const { lat, lon, fullAddress, city, state, pincode } = req.body;

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ message: 'lat and lon must be numbers.' });
  }

  try {
    const settingsRaw = await prisma.storeSettings.findFirst();
    const settings = formatMongoCompat(settingsRaw) || {
      location:         { lat: 13.005865, lon: 79.995026 },
      deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 30,
    };

    const result = isWithinDeliveryRadius(
      lat, lon,
      settings.location?.lat ?? 13.005865,
      settings.location?.lon ?? 79.995026,
      settings.deliveryRadiusKm ?? 30
    );

    const userId = req.user._id || req.user.id;
    await prisma.user.update({
      where: { id: userId },
      data: {
        deliveryAddress: {
          lat,
          lon,
          fullAddress:       fullAddress || '',
          city:              city        || '',
          state:             state       || '',
          pincode:           pincode     || '',
          distanceFromStore: result.distance,
          deliveryAvailable: result.isEligible,
          updatedAt:         new Date(),
        },
      },
    });

    return res.json({
      message:           'Location saved successfully.',
      distanceKm:        result.distance,
      deliveryAvailable: result.isEligible,
    });
  } catch (error) {
    console.error('Location save error:', error.message);
    res.status(500).json({ message: 'Server error while saving location.' });
  }
});

export default router;
