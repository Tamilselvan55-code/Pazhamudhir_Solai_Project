import express from 'express';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';

const router = express.Router();

router.get('/settings', async (req, res) => {
  try {
    let settingsRaw = await prisma.storeSettings.findFirst();
    if (!settingsRaw) {
      settingsRaw = await prisma.storeSettings.create({
        data: {
          storeName: 'Tiruchendur Murugan Pazhamudhir Solai',
          location: { lat: 13.0606941, lon: 80.2270751 },
          deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 30
        }
      });
    } else {
      let needsUpdate = false;
      const updateData = {};

      if (settingsRaw.storeName && settingsRaw.storeName.includes('Palumanicholai')) {
        updateData.storeName = 'Tiruchendur Murugan Pazhamudhir Solai';
        needsUpdate = true;
      }
      const currentLat = Number(settingsRaw.location?.lat ?? settingsRaw.lat);
      if (currentLat === 13.005865 || !settingsRaw.location) {
        updateData.location = { lat: 13.0606941, lon: 80.2270751 };
        needsUpdate = true;
      }

      if (needsUpdate) {
        settingsRaw = await prisma.storeSettings.update({
          where: { id: settingsRaw.id },
          data: updateData
        });
      }
    }

    const formatted = formatMongoCompat(settingsRaw) || {};
    const storeLatitude = Number(formatted.location?.lat ?? formatted.lat ?? 13.0606941);
    const storeLongitude = Number(formatted.location?.lon ?? formatted.lon ?? 80.2270751);
    const deliveryRadiusKm = Number(formatted.deliveryRadiusKm ?? 30);
    const storeName = formatted.storeName || 'Tiruchendur Murugan Pazhamudhir Solai';

    res.json({
      ...formatted,
      storeName,
      storeLatitude,
      storeLongitude,
      deliveryRadiusKm,
      location: { lat: storeLatitude, lon: storeLongitude }
    });
  } catch (error) {
    console.error('Fetch store settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching store settings',
      error: error.message || String(error),
      stack: error.stack
    });
  }
});

export default router;

