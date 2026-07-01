import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { ensureAdminUser } from './utils/ensureAdminUser.js';
import { initializeAnalyticsIndexes } from './utils/initializeIndexes.js';

const DATABASE_RETRY_DELAY_MS = 10000;
let databaseRetryTimer;
let isShuttingDown = false;

async function connectToDatabase() {
  try {
    await connectDatabase();
    console.log('Database connected');
    await ensureAdminUser({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      logger: console
    });
    await initializeAnalyticsIndexes();
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);

    if (!isShuttingDown) {
      console.log(`Retrying database connection in ${DATABASE_RETRY_DELAY_MS / 1000} seconds`);
      databaseRetryTimer = setTimeout(connectToDatabase, DATABASE_RETRY_DELAY_MS);
    }
  }
}

const server = app.listen(env.port, () => {
  console.log(`TypePath API listening on port ${env.port} (${env.nodeEnv})`);
  void connectToDatabase();
});

server.on('error', (error) => {
  console.error(`HTTP server startup failed: ${error.message}`);
  process.exitCode = 1;
});

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  clearTimeout(databaseRetryTimer);
  console.log(`${signal} received; shutting down`);

  server.close(async (error) => {
    if (error) {
      console.error(`HTTP server shutdown failed: ${error.message}`);
      process.exitCode = 1;
    }

    try {
      await disconnectDatabase();
    } catch (databaseError) {
      console.error(`Database shutdown failed: ${databaseError.message}`);
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
