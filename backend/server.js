const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const http = require('http');
const socketService = require('./services/socket.service');
require('./services/cronJobs'); // Start cron jobs

// Import routes
const authRoutes = require('./routes/auth.routes');
const jobRoutes = require('./routes/job.routes');
const applicationRoutes = require('./routes/application.routes');
const userRoutes = require('./routes/user.routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketService.initSocket(server);

// Middleware in correct order
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Application Portal API',
      version: require('./package.json').version,
      description: 'API documentation for Job Application Portal. Use Bearer token for authentication.',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    servers: [{ url: process.env.API_URL || 'http://localhost:5000' }],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global Error handling middleware (LAST)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to database then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📖 API documentation available at http://localhost:${PORT}/api/docs`);
  });
});

// Handle uncaughtException and unhandledRejection
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('SIGTERM/SIGINT received. Shutting down gracefully...');
  server.close(async () => {
    console.log('Process terminated. Closing database connection...');
    await mongoose.connection.close();
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
