import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool from '../config/db.js';
import { confirmDestructive } from './_guard.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Refuses to run without --confirm, and makes a remote target be typed
  // back before touching it (MEL2-OPS-001).
  const { dryRun } = await confirmDestructive(
    'Creates and populates the leadership_history table.'
  );
  if (dryRun) {
    console.log('[dry-run] No changes were made.');
    process.exit(0);
  }

  const sqlPath = path.resolve(__dirname, '../../../database/leadership_history.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('✓ leadership_history table ready');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
