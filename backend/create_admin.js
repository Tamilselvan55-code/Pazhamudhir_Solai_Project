import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from './utils/prismaClient.js';

dotenv.config();

const args = process.argv.slice(2);
const name = args[0];
const email = args[1];
const password = args[2];
const role = args[3] || 'Admin';

if (!name || !email || !password) {
  console.log('\n--- Prisma Admin Creator ---');
  console.log('Usage:');
  console.log('  node create_admin.js "<Name>" "<Email>" "<Password>" "<Role>"\n');
  console.log('Roles allowed: "Super Admin", "Admin", "Manager", "Staff"\n');
  console.log('Example:');
  console.log('  node create_admin.js "Ganesh" "ganesh@example.com" "Ganesh@123" "Admin"\n');
  process.exit(0);
}

async function run() {
  try {
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      console.log(`Error: An admin account with email ${email} already exists.`);
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        permissions: {
          products: true,
          orders: true,
          reports: true,
          settings: true,
          users: true,
          notifications: true
        }
      }
    });

    console.log(`\n🎉 Success! Created Admin account:`);
    console.log(`Name:  ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role:  ${admin.role}\n`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

run();
