import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

connectDatabase()
  .then(() => app.listen(env.port, () => console.log(`API listening on port ${env.port}`)))
  .catch((error) => { console.error('Startup failed:', error.message); process.exit(1); });
