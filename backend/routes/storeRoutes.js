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
          location: { lat: 12.9666144, lon: 79.9458077 },
          deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 40
        }
      });
    } else if (settingsRaw.storeName && settingsRaw.storeName.includes('Palumanicholai')) {
      settingsRaw = await prisma.storeSettings.update({
        where: { id: settingsRaw.id },
        data: { storeName: 'Tiruchendur Murugan Pazhamudhir Solai' }
      });
    }
    res.json(formatMongoCompat(settingsRaw));
  } catch (error) {
    console.error('Fetch store settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
