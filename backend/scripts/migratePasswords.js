const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const migratePasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all users that have password but no passwordHash
    const users = await User.find({
      password: { $exists: true },
      passwordHash: { $exists: false }
    }).select('+password');

    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      console.log(`Migrating user: ${user.email}`);
      
      // Hash the existing password
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(user.password, salt);
      
      // Update user with passwordHash
      await User.updateOne(
        { _id: user._id },
        { $set: { passwordHash } }
      );
      
      console.log(`✅ Migrated: ${user.email}`);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migratePasswords();
