import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/typepath_ssc',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me-please',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development'
};

if (env.nodeEnv === 'production' && env.jwtSecret.includes('development')) {
  throw new Error('JWT_SECRET must be configured in production');
}

if (env.nodeEnv === 'production' && env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

if (env.nodeEnv === 'production' && /127\.0\.0\.1|localhost/.test(env.mongoUri)) {
  throw new Error('MONGODB_URI must point to a production database');
}
