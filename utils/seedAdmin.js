require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@masterbuilderschool.com').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists for ${email}. No changes made.`);
    process.exit(0);
  }

  const admin = await User.create({
    name: process.env.SEED_ADMIN_NAME || 'School Administrator',
    email,
    password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
    role: 'admin'
  });

  console.log('✅ Admin account created:');
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: ${process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'}`);
  console.log('   ⚠️  Log in and change this password immediately.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
