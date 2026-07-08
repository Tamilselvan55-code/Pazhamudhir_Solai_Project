import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/grocery_store';

import PendingUser from './models/PendingUser.js';

async function run() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const pending = await PendingUser.findOne({ email: 'temp_test@example.com' });
  if (pending) {
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash('123456', salt);
    pending.emailVerificationOTP = hashedOtp;
    pending.emailVerificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    pending.emailVerificationAttempts = 0;
    await pending.save();
    console.log('OTP for temp_test@example.com successfully set to 123456');
  } else {
    console.log('Pending user not found');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
