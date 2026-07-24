import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();

async function traceClearAll() {
  try {
    // 1. Get any customer
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found');
    
    console.log('Using User:', user.id);

    // 2. Generate a token directly
    const token = jwt.sign({ id: user.id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Create a test notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Clear All Test',
        message: 'This should be cleared',
        type: 'info',
        role: 'customer'
      }
    });

    console.log('Created test notification.');

    // 4. Send the HTTP request
    console.log('Sending DELETE /api/notifications/clear-all...');
    const clearRes = await axios.delete('http://localhost:5000/api/notifications/clear-all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('HTTP Response Status:', clearRes.status);
    console.log('HTTP Response Data:', clearRes.data);

  } catch (err) {
    if (err.response) {
      console.error('Error Status:', err.response.status);
      console.error('Error Data:', err.response.data);
    } else {
      console.error(err);
    }
  } finally {
    await prisma.$disconnect();
  }
}
traceClearAll();
