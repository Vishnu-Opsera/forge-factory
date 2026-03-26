import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';

async function runMigrations() {
  console.log('[db] Running migrations…');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('[db] Migrations complete.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('[db] Migration failed:', err);
  process.exit(1);
});
