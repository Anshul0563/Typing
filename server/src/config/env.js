import dotenv from 'dotenv';
dotenv.config();

export const normalizeJwtExpiry = (value = '7d') => {
  const expiry = String(value).trim();
  // jsonwebtoken interprets a numeric string as milliseconds. Environment
  // values such as JWT_EXPIRES_IN=7 are conventionally intended as days.
  return /^\d+$/.test(expiry) ? `${expiry}d` : expiry || '7d';
};

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/typepath_ssc',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me-please',
  jwtExpiresIn: normalizeJwtExpiry(process.env.JWT_EXPIRES_IN),
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

if (env.nodeEnv === 'production') {
  const clientOrigins = env.clientUrl.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!clientOrigins.length || clientOrigins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('CLIENT_URL must contain the HTTPS origin of the production frontend');
  }
  if (clientOrigins.some((origin) => origin.includes('*'))) {
    throw new Error('CLIENT_URL must use exact origins; wildcards are not allowed in production');
  }
}
