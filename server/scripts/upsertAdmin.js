import '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User } from '../src/models/User.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
}

try {
  await connectDatabase();

  let admin = await User.findOne({ email }).select('+password');
  const created = !admin;

  if (!admin) {
    admin = new User({ name: 'Administrator', email, password, role: 'admin' });
  } else {
    admin.password = password;
    admin.role = 'admin';
    admin.isActive = true;
  }

  await admin.save();
  console.log(`Admin ${created ? 'created' : 'updated'}: ${admin.email}`);
} finally {
  await disconnectDatabase();
}
