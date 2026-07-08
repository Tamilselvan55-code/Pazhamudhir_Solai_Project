import mongoose from 'mongoose';
import StoreSettings from './models/StoreSettings.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tiruchendur_grocery';

const updateCoords = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB to update coords');
    
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = new StoreSettings({});
    }
    settings.location = { lat: 13.0606941, lon: 80.2270751 };
    settings.deliveryRadiusKm = Number(process.env.DELIVERY_RADIUS_KM) || 35;
    await settings.save();
    console.log('Coordinates and Delivery Radius (35 km) updated in DB successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

updateCoords();
