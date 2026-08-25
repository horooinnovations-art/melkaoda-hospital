#!/usr/bin/env node
/**
 * Lightweight SQL migration runner.
 * Tracks applied files in `schema_migrations`.
 *
 * Usage: npm run migrate
 * Place ordered *.sql files in database/migrations/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool, { query } from '../config/db.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../../database/migrations');

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function main() {
  if (!fs.existsSync(migrationsDir)) {
    console.error(`[migrate] Missing directory: ${migrationsDir}`);
    process.exit(1);
  }

  await ensureTable();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await query(
      `SELECT id FROM schema_migrations WHERE name = :name LIMIT 1`,
      { name: file }
    );
    if (applied.length) {
      console.log(`[migrate] skip ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      await conn.execute(`INSERT INTO schema_migrations (name) VALUES (?)`, [file]);
      await conn.commit();
      console.log(`[migrate] applied ${file}`);
    } catch (err) {
      await conn.rollback();
      console.error(`[migrate] failed ${file}:`, err.message);
      process.exit(1);
    } finally {
      conn.release();
    }
  }

  console.log('[migrate] done');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
