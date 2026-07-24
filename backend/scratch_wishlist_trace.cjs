const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function traceWishlist() {
  try {
    const product = await prisma.product.findFirst();
    const phone = '99' + Math.floor(10000000 + Math.random() * 90000000);
    const email = phone + '@test.com';
    const registerRes = await axios.post('http://localhost:5000/api/auth/register', {
      fullName: 'Wishlist Tester',
      phoneNumber: phone,
      email: email,
      password: 'password123'
    });
    
    const token = registerRes.data.token;
    const userId = registerRes.data._id;
    console.log('--- USER CREATED ---');
    
    console.log('\n--- POST /api/wishlist/:productId ---');
    const addRes = await axios.post('http://localhost:5000/api/auth/wishlist/' + product.id, {}, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Response:', JSON.stringify(addRes.data, null, 2));

    console.log('\n--- DATABASE RECORD ---');
    const dbRecord = await prisma.wishlistItem.findFirst({
      where: { userId: userId, productId: product.id }
    });
    console.log(JSON.stringify(dbRecord, null, 2));

    console.log('\n--- GET /api/auth/wishlist ---');
    const getRes = await axios.get('http://localhost:5000/api/auth/wishlist', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Response length:', getRes.data.length);
    console.log('Sample item:', JSON.stringify(getRes.data[0], null, 2));

    console.log('\n--- DELETE /api/auth/wishlist/:productId ---');
    const delRes = await axios.delete('http://localhost:5000/api/auth/wishlist/' + product.id, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Response:', JSON.stringify(delRes.data, null, 2));

  } catch (err) {
    console.error(err.response ? err.response.data : err);
  } finally {
    await prisma.$disconnect();
  }
}
traceWishlist();
