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

/**
 * Split a migration file into executable statements.
 *
 * The previous version was `sql.split(/;\s*\n/).filter(s => !s.startsWith('--'))`,
 * which discarded any statement chunk that happened to begin with a comment —
 * i.e. every migration in this project, since all of them open with a `--`
 * header. Both 001 and 002 yielded zero statements and were still recorded in
 * `schema_migrations` as applied, so the runner reported success while changing
 * nothing (MEL-BUG-002).
 *
 * Now comments are stripped per line and the remaining SQL is split, so a
 * documented migration runs exactly like an undocumented one.
 */
export function parseStatements(sql) {
  const withoutComments = String(sql)
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  // Split on semicolons that are not inside a quoted string. The previous
  // version split on every `;`, so an idempotency guard that carries DDL as a
  // string literal — `SELECT IF(..., 'ALTER TABLE ...;', 'DO 0')` — was torn in
  // half and the migration failed with a syntax error (MEL2-DB-001).
  const statements = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < withoutComments.length; i += 1) {
    const char = withoutComments[i];

    if (quote) {
      current += char;
      // Doubled quote inside a string is an escaped quote, not a terminator.
      if (char === quote) {
        if (withoutComments[i + 1] === quote) {
          current += withoutComments[i + 1];
          i += 1;
        } else {
          quote = null;
        }
      } else if (char === '\\') {
        // Backslash escape: consume the next character verbatim.
        current += withoutComments[i + 1] ?? '';
        i += 1;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
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
    const statements = parseStatements(sql);

    // A file that parses to nothing is a bug in the file or the parser. Do not
    // mark it applied — that is what hid MEL-BUG-002.
    if (!statements.length) {
      console.error(`[migrate] ${file} contains no executable statements — refusing to mark it applied.`);
      process.exit(1);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      await conn.execute(`INSERT INTO schema_migrations (name) VALUES (?)`, [file]);
      await conn.commit();
      console.log(`[migrate] applied ${file} (${statements.length} statement(s))`);
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

// Allow `node migrate.js` to run, but keep parseStatements importable for tests.
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
