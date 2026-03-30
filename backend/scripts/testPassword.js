const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const testPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: 'ansh01@gmail.com' }).select('+password +passwordHash');
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', user.email);
    console.log('Has password field:', !!user.password);
    console.log('Has passwordHash field:', !!user.passwordHash);
    console.log('Password length:', user.password?.length);
    console.log('PasswordHash length:', user.passwordHash?.length);
    console.log('Password starts with $2b$ or $2a$:', user.password?.startsWith('$2'));
    console.log('PasswordHash starts with $2b$ or $2a$:', user.passwordHash?.startsWith('$2'));

    // The password field might already be hashed, let's test it directly
    console.log('\n--- Testing if password field is already hashed ---');
    
    // Test if password field matches passwordHash (they should be the same after migration)
    if (user.password === user.passwordHash) {
      console.log('Password and PasswordHash are identical');
    } else {
      console.log('Password and PasswordHash are different');
    }

    // Test common passwords
    const commonPasswords = [
      'password',
      'Password123',
      'password123',
      '123456',
      '123456789',
      'qwerty',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      'dragon',
      'password1',
      '123123',
      'abc123',
      'ansh01',
      'ansh',
      'user',
      'test'
    ];

    console.log('\n--- Testing common passwords ---');
    for (const testPwd of commonPasswords) {
      try {
        const result = await bcrypt.compare(testPwd, user.passwordHash);
        if (result) {
          console.log(`🎉 FOUND MATCH! Password is: "${testPwd}"`);
          return;
        } else {
          console.log(`Password "${testPwd}": NO MATCH`);
        }
      } catch (error) {
        console.log(`Password "${testPwd}": ERROR - ${error.message}`);
      }
    }

    console.log('\n--- No common passwords matched ---');
    console.log('You may need to reset the password for this user');

    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testPassword();
