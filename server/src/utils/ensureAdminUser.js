import { User } from '../models/User.js';

export async function ensureAdminUser({ email, password, logger = console, required = false } = {}) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    if (required) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
    }
    return { skipped: true, reason: 'missing-admin-env' };
  }

  let admin = await User.findOne({ email: normalizedEmail }).select('+password');
  const created = !admin;

  if (!admin) {
    admin = new User({ name: 'Administrator', email: normalizedEmail, password, role: 'admin' });
  } else {
    admin.password = password;
    admin.role = 'admin';
    admin.isActive = true;
  }

  await admin.save();
  logger.info?.(`Admin ${created ? 'created' : 'updated'}: ${admin.email}`);

  return { skipped: false, created, email: admin.email };
}
