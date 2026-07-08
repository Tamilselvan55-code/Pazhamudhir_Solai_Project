import bcrypt from 'bcryptjs';
try {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Test@123', salt);
  console.log('bcrypt OK:', hash.substring(0, 20));
} catch(e) {
  console.error('bcrypt FAIL:', e.message);
}
