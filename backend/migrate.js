import prisma from './utils/prismaClient.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma for migration check');
    const allUsers = await prisma.user.findMany();
    console.log(`Found ${allUsers.length} users to inspect`);

    for (let u of allUsers) {
      if (!u.fullName) {
        let defaultName = 'Valued Customer';
        if (u.email && u.email.includes('@')) {
          const part = u.email.split('@')[0];
          const cleaned = part.replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleaned.length >= 3) {
            defaultName = cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          }
        }
        await prisma.user.update({
          where: { id: u.id },
          data: { fullName: defaultName }
        });
        console.log(`Migrated user ${u.email || u.phoneNumber} -> fullName: ${defaultName}`);
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
