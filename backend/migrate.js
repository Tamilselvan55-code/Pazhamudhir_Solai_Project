import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tiruchendur_grocery';

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for migration');
    const usersColl = mongoose.connection.db.collection('users');
    
    const allUsers = await usersColl.find({}).toArray();
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
        await usersColl.updateOne(
          { _id: u._id },
          { 
            $set: { fullName: defaultName },
            $unset: { name: "" } 
          }
        );
        console.log(`Migrated user ${u.email || u.phoneNumber} -> fullName: ${defaultName}`);
      } else {
        // Just remove legacy name if exists
        await usersColl.updateOne({ _id: u._id }, { $unset: { name: "" } });
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
