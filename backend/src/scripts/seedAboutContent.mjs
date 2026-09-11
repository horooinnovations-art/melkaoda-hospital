#!/usr/bin/env node
/**
 * Emit the About-page seed copy as SQL, for pasting into a MySQL session.
 *
 * Why this exists rather than "just turn SCHEMA_BOOTSTRAP on for one restart":
 * that switch also runs ALTER TABLE guards, a gallery slug backfill, an address
 * cleanup, the bootstrap-admin check and the root-admin reconciliation. None of
 * that is wanted when the only goal is two missing settings rows, and on a live
 * hospital database the smallest change that does the job is the right one.
 *
 * Reads the values out of bootstrapSchema.js so the copy is never retyped, and
 * escapes them for MySQL. INSERT IGNORE, so anything an editor has already
 * written is left alone.
 *
 *   node src/scripts/seedAboutContent.mjs            # print the SQL
 *   node src/scripts/seedAboutContent.mjs > seed.sql # or capture it
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// mysql2 re-exports sqlstring's escape; use the driver's own so the
// escaping matches what the application would produce.
import mysql from 'mysql2';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(here, '../config/bootstrapSchema.js'), 'utf8');

/**
 * SEED_CONTENT_SETTINGS is a module-private const, so read its object literal
 * out of the file rather than exporting it purely for this script's benefit.
 */
function readSeedLiteral(src) {
  const marker = 'const SEED_CONTENT_SETTINGS = {';
  const start = src.indexOf(marker);
  if (start === -1) throw new Error('SEED_CONTENT_SETTINGS not found in bootstrapSchema.js');
  const open = start + marker.length - 1;
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error('unterminated SEED_CONTENT_SETTINGS literal');
}

// The literal is plain data — string keys and concatenated string values.
const seed = new Function(`return ${readSeedLiteral(source)};`)();

/**
 * MySQL string-literal escaping.
 *
 * Delegated to mysql2 rather than hand-rolled. The copy contains apostrophes
 * and em dashes, and a home-made replace chain is precisely where a quoting bug
 * hides until it either breaks the import or, worse, silently truncates a value
 * at the first unescaped quote.
 */
function sqlQuote(value) {
  return mysql.escape(String(value));
}

const WANTED = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const keys = (WANTED.length ? WANTED : ['purpose', 'patient_care_promise']).filter(
  (k) => seed[k]
);

if (!keys.length) {
  console.error('None of the requested keys exist in SEED_CONTENT_SETTINGS.');
  process.exit(1);
}

console.log('-- Generated from backend/src/config/bootstrapSchema.js');
console.log('-- INSERT IGNORE: an existing row keeps whatever an editor wrote.');
console.log('INSERT IGNORE INTO `settings` (`key`, value, type, created_at, updated_at) VALUES');
console.log(
  keys.map((k) => `  (${sqlQuote(k)}, ${sqlQuote(seed[k])}, 'string', NOW(), NOW())`).join(',\n') +
    ';'
);
console.log('');
console.log('SELECT `key`, CHAR_LENGTH(value) AS chars FROM `settings`');
console.log(`WHERE \`key\` IN (${keys.map(sqlQuote).join(', ')});`);
