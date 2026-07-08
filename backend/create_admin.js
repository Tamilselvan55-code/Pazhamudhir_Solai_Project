import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not set in .env file.');
  process.exit(1);
}

const args = process.argv.slice(2);
const name = args[0];
const email = args[1];
const password = args[2];
const role = args[3] || 'Admin';

if (!name || !email || !password) {
  console.log('\n--- MongoDB Admin Creator ---');
  console.log('Usage:');
  console.log('  node create_admin.js "<Name>" "<Email>" "<Password>" "<Role>"\n');
  console.log('Roles allowed: "Super Admin", "Admin", "Manager", "Staff"\n');
  console.log('Example:');
  console.log('  node create_admin.js "Ganesh" "ganesh@example.com" "Ganesh@123" "Admin"\n');
  process.exit(0);
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully.');

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log(`Error: An admin account with email ${email} already exists.`);
      process.exit(1);
    }

    const admin = new Admin({
      name,
      email,
      password, // The model's pre-save hook will automatically encrypt this password
      role,
      permissions: {
        products: true,
        orders: true,
        reports: true,
        settings: true,
        users: true,
        notifications: true
      }
    });

    await admin.save();
    console.log(`\n🎉 Success! Created Admin account:`);
    console.log(`Name:  ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role:  ${admin.role}\n`);
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
