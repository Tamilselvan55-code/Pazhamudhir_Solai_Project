import prisma from './utils/prismaClient.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  await prisma.$connect();
  console.log('Connected to PostgreSQL via Prisma');

  const pending = await prisma.pendingUser.findFirst({
    where: { email: 'temp_test@example.com' }
  });
  if (pending) {
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash('123456', salt);
    await prisma.pendingUser.update({
      where: { id: pending.id },
      data: {
        emailVerificationOTP: hashedOtp,
        emailVerificationOTPExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        emailVerificationAttempts: 0
      }
    });
    console.log('OTP for temp_test@example.com successfully set to 123456');
  } else {
    console.log('Pending user not found');
  }

  await prisma.$disconnect();
}

run().catch(console.error);
