import express from 'express';
import StoreSettings from '../models/StoreSettings.js';
import User from '../models/User.js';
import { isWithinDeliveryRadius } from '../utils/distance.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ── POST /api/location/verify — Server-side coordinate verification ───────────
// Used by the frontend to get a trusted delivery eligibility check.
// The frontend cannot fake this because coordinates come directly from the GPS
// request, and any tampered values would still fail the 5 km server check on
// order creation.
router.post('/verify', async (req, res) => {
  const { lat, lon } = req.body;

  // Basic validation
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ message: 'lat and lon must be numbers.' });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ message: 'Coordinates out of valid range.' });
  }

  try {
    // Load store settings (fallback to hardcoded if not in DB yet)
    let settings = await StoreSettings.findOne();
    if (!settings) {
      // Temporary testing value. Change back to 5 KM before production.
      settings = {
        location:         { lat: 13.0606941, lon: 80.2270751 },
        deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 5,
      };
    }

    const result = isWithinDeliveryRadius(
      lat, lon,
      settings.location.lat,
      settings.location.lon,
      settings.deliveryRadiusKm
    );

    return res.json({
      lat,
      lon,
      distanceKm:        result.distance,
      deliveryAvailable: result.isEligible,
      radiusKm:          settings.deliveryRadiusKm,
      storeLat:          settings.location.lat,
      storeLon:          settings.location.lon,
      message:           result.isEligible
        ? 'Delivery available at your location.'
        : `Sorry, delivery is available only within ${settings.deliveryRadiusKm} km of the store.`,
    });
  } catch (error) {
    console.error('Location verify error:', error.message);
    res.status(500).json({ message: 'Server error during location verification.' });
  }
});

// ── POST /api/location/save — Save verified location to user profile ──────────
router.post('/save', protect, async (req, res) => {
  const { lat, lon, fullAddress, city, state, pincode } = req.body;

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ message: 'lat and lon must be numbers.' });
  }

  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      // Temporary testing value. Change back to 5 KM before production.
      settings = {
        location:         { lat: 13.0606941, lon: 80.2270751 },
        deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 5,
      };
    }

    const result = isWithinDeliveryRadius(
      lat, lon,
      settings.location.lat,
      settings.location.lon,
      settings.deliveryRadiusKm
    );

    await User.findByIdAndUpdate(req.user._id, {
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
