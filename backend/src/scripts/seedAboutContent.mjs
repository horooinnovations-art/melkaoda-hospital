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

const ARGS = process.argv.slice(2);

/**
 * --overwrite replaces the value of a key that already exists.
 *
 * The default is deliberately additive, because the usual case is a key the
 * database has never held and an editor's wording must never be destroyed by a
 * seeding script. But a row can be wrong rather than merely present: on the
 * live site `purpose` and `patient_care_promise` were both filled with a copy
 * of the mission's opening paragraph, so the About page showed the same
 * sentence three times. INSERT IGNORE cannot repair that, and telling someone
 * to hand-write an UPDATE against a hospital database is worse than giving them
 * one generated from the same source as the seed copy.
 *
 * It still only touches the keys named, and it prints the current values first
 * so whatever is being replaced can be read before it is gone.
 */
const OVERWRITE = ARGS.includes('--overwrite');
const WANTED = ARGS.filter((a) => !a.startsWith('-'));
const keys = (WANTED.length ? WANTED : ['purpose', 'patient_care_promise']).filter(
  (k) => seed[k]
);

if (!keys.length) {
  console.error('None of the requested keys exist in SEED_CONTENT_SETTINGS.');
  process.exit(1);
}

const keyList = keys.map(sqlQuote).join(', ');

console.log('-- Generated from backend/src/config/bootstrapSchema.js');

if (OVERWRITE) {
  console.log('--');
  console.log('-- OVERWRITE: this REPLACES the current value of each key listed.');
  console.log('-- Read the SELECT output below before running the UPDATEs, and keep');
  console.log('-- a copy of anything you still want.');
  console.log('');
  console.log('SELECT `key`, value FROM `settings` WHERE `key` IN (' + keyList + ');');
  console.log('');
  for (const k of keys) {
    console.log(
      'UPDATE `settings` SET value = ' +
        sqlQuote(seed[k]) +
        ", type = 'string', updated_at = NOW() WHERE `key` = " +
        sqlQuote(k) +
        ';'
    );
  }
} else {
  console.log('-- INSERT IGNORE: an existing row keeps whatever an editor wrote.');
  console.log('-- Use --overwrite to replace a row that exists but holds the wrong copy.');
  console.log('INSERT IGNORE INTO `settings` (`key`, value, type, created_at, updated_at) VALUES');
  console.log(
    keys
      .map((k) => `  (${sqlQuote(k)}, ${sqlQuote(seed[k])}, 'string', NOW(), NOW())`)
      .join(',\n') + ';'
  );
}

console.log('');
console.log('SELECT `key`, CHAR_LENGTH(value) AS chars FROM `settings`');
console.log(`WHERE \`key\` IN (${keyList});`);
