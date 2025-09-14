require('dotenv').config();  // Load environment variables from .env

module.exports = {
  // MongoDB Atlas Connection
  MONGODB_URI: process.env.MONGO_URI,
  
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  BCRYPT_ROUNDS: 12,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 100,
  
  // Face Verification
  FACE_VERIFICATION_TIMEOUT: 10000, // 10 seconds
  FACE_VERIFICATION_REQUIRED: true,
  
  // QR Code Settings
  QR_CODE_SIZE: 300,
  QR_CODE_MARGIN: 2,
  
  // Session Settings
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
};
