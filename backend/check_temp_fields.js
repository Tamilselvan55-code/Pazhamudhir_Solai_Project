import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/grocery_store';

import User from './models/User.js';
import PendingUser from './models/PendingUser.js';

async function run() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const pending = await PendingUser.findOne({ email: 'temp_test@example.com' });
  console.log('PENDING USER IN DB:');
  if (pending) {
    console.log('Found:', pending.fullName, pending.phoneNumber);
    console.log('emailVerificationOTP (hashed):', !!pending.emailVerificationOTP);
    console.log('emailVerificationAttempts:', pending.emailVerificationAttempts);
    console.log('resendAttempts:', pending.resendAttempts);
  } else {
    console.log('Not found in PendingUser');
  }

  const user = await User.findOne({ email: 'temp_test@example.com' });
  console.log('USER IN DB:');
  if (user) {
    console.log('Found in User collection! (This is an ERROR!)', user.fullName);
  } else {
    console.log('Not found in User collection (CORRECT!)');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
