const mongoose = require('mongoose');

const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000; // 5 seconds

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/job-portal');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection attempt ${retryCount + 1} failed:`, error.message);

    if (retryCount < MAX_RETRIES - 1) {
      console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectDB(retryCount + 1);
    } else {
      console.error('Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;
