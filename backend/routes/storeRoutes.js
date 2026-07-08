import express from 'express';
import StoreSettings from '../models/StoreSettings.js';

const router = express.Router();

router.get('/settings', async (req, res) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      // Default fallback coordinates if not configured
      settings = await StoreSettings.create({
        storeName: 'Tiruchendur Murugan Pazhamudhir Solai',
        location: { lat: 13.0606941, lon: 80.2270751 },
        deliveryRadiusKm: 5
      });
    } else if (settings.storeName && settings.storeName.includes('Palumanicholai')) {
      settings.storeName = 'Tiruchendur Murugan Pazhamudhir Solai';
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
