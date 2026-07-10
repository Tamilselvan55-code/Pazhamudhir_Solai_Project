import prisma from './utils/prismaClient.js';
import dotenv from 'dotenv';

dotenv.config();

const updateCoords = async () => {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma to update coords');
    
    let settings = await prisma.storeSettings.findFirst();
    if (!settings) {
      await prisma.storeSettings.create({
        data: {
          location: { lat: 12.9666144, lon: 79.9458077 },
          deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 40
        }
      });
    } else {
      await prisma.storeSettings.update({
        where: { id: settings.id },
        data: {
          location: { lat: 12.9666144, lon: 79.9458077 },
          deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 40
        }
      });
    }
    console.log('Coordinates and Delivery Radius (40 km) updated in DB successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

updateCoords();
