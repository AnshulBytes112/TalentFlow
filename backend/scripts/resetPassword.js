const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: 'ansh01@gmail.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }

    // Set new password and let the pre-save hook handle hashing
    const newPassword = 'Password123';
    user.password = newPassword;
    
    await user.save();
    
    console.log(`✅ Password reset successfully for ${user.email}`);
    console.log(`🔑 New password is: ${newPassword}`);
    
    // Test the new password
    const testUser = await User.findOne({ email: 'ansh01@gmail.com' }).select('+passwordHash');
    const isValid = await testUser.comparePassword(newPassword);
    console.log(`✅ Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);

    process.exit(0);
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
};

resetPassword();
