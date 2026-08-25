import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
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
