import '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { ensureAdminUser } from '../src/utils/ensureAdminUser.js';

try {
  await connectDatabase();
  await ensureAdminUser({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    required: true
  });
} finally {
  await disconnectDatabase();
}
