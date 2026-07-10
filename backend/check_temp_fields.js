import prisma from './utils/prismaClient.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  await prisma.$connect();
  console.log('Connected to PostgreSQL via Prisma');

  const pending = await prisma.pendingUser.findFirst({
    where: { email: 'temp_test@example.com' }
  });
  console.log('PENDING USER IN DB:');
  if (pending) {
    console.log('Found:', pending.fullName, pending.phoneNumber);
    console.log('emailVerificationOTP (hashed):', !!pending.emailVerificationOTP);
    console.log('emailVerificationAttempts:', pending.emailVerificationAttempts);
    console.log('resendAttempts:', pending.resendAttempts);
  } else {
    console.log('Not found in PendingUser');
  }

  const user = await prisma.user.findFirst({
    where: { email: 'temp_test@example.com' }
  });
  console.log('USER IN DB:');
  if (user) {
    console.log('Found in User collection! (This is an ERROR!)', user.fullName);
  } else {
    console.log('Not found in User collection (CORRECT!)');
  }

  await prisma.$disconnect();
}

run().catch(console.error);
