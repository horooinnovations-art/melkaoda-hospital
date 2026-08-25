import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const sslCaRaw = process.env.MYSQL_ATTR_SSL_CA || process.env.DB_SSL_CA;
const wantSsl =
  Boolean(sslCaRaw) ||
  process.env.DB_SSL === 'true' ||
  process.env.DB_SSL === '1';

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'loke_hospital',
  waitForConnections: true,
  connectionLimit: 20,
  namedPlaceholders: true,
  dateStrings: true,
};

function resolveCa(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.includes('BEGIN CERTIFICATE')) return trimmed;
  // Allow file path to a PEM on disk (cPanel / local)
  try {
    if (fs.existsSync(trimmed)) {
      const contents = fs.readFileSync(trimmed, 'utf8');
      if (contents.includes('BEGIN CERTIFICATE')) return contents;
    }
  } catch {
    /* ignore */
  }
  return null;
}

if (wantSsl) {
  const ca = resolveCa(sslCaRaw);
  const allowInsecure =
    process.env.DB_SSL_INSECURE === 'true' || process.env.DB_SSL_INSECURE === '1';

  if (ca) {
    poolConfig.ssl = { rejectUnauthorized: true, ca };
  } else if (allowInsecure) {
    // Explicit opt-in only — never silent
    console.warn(
      '[db] DB_SSL_INSECURE=1: TLS enabled without certificate verification (MITM risk).'
    );
    poolConfig.ssl = { rejectUnauthorized: false };
  } else if (sslCaRaw) {
    throw new Error(
      '[db] MYSQL_ATTR_SSL_CA / DB_SSL_CA is set but is not a PEM string or readable PEM file. ' +
        'Inline the certificate, point to a PEM file, or set DB_SSL_INSECURE=1 only if you accept the risk.'
    );
  } else {
    // DB_SSL=true without CA — require explicit insecure flag
    throw new Error(
      '[db] DB_SSL is enabled but no CA was provided. Set MYSQL_ATTR_SSL_CA to a PEM, or DB_SSL_INSECURE=1 to opt in.'
    );
  }
}

const pool = mysql.createPool(poolConfig);

export async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = {}) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export default pool;
