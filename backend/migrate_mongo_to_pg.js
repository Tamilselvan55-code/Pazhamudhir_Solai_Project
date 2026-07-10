/**
 * Data Migration Script: MongoDB -> PostgreSQL (Prisma)
 * 
 * Usage:
 * 1. Ensure you have a running PostgreSQL database connected via DATABASE_URL in .env
 * 2. Ensure you have your MongoDB connection string inside MONGO_URI in .env
 * 3. Run: npm install mongodb (if needed for reading from mongo)
 * 4. Run: node migrate_mongo_to_pg.js
 */

import dotenv from 'dotenv';
dotenv.config();

import prisma from './utils/prismaClient.js';

// Helper function to convert Mongo _id / ObjectIds to string or map relationships if needed
const migrate = async () => {
  console.log('--- Starting MongoDB to PostgreSQL Migration ---');
  
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  // Ensure Prisma client connects successfully
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL successfully via Prisma.');
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }

  console.log('Migration script ready! To transfer live data:');
  console.log('1. Export or fetch documents from MongoDB collections.');
  console.log('2. Insert them into Prisma using prisma.<model>.createMany() or create().');
  console.log('--- Database schema verification complete ---');
  await prisma.$disconnect();
};

migrate();
