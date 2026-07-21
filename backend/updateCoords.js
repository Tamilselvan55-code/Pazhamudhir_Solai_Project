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
          storeName: 'Tiruchendur Murugan Pazhamudhir Solai',
          location: { lat: 13.0606941, lon: 80.2270751 },
          deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 30
        }
      });
    } else {
      await prisma.storeSettings.update({
        where: { id: settings.id },
        data: {
          storeName: 'Tiruchendur Murugan Pazhamudhir Solai',
          location: { lat: 13.0606941, lon: 80.2270751 },
          deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 30
        }
      });
    }
    console.log('Coordinates (13.0606941, 80.2270751) and Delivery Radius (30 km) synced to DB successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

updateCoords();
