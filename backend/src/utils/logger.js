/**
 * Tiny structured logger (levels + JSON-ish lines).
 * Replaces ad-hoc console noise at the process boundary without a heavy dependency.
 */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function currentLevel() {
  const raw = String(process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase();
  return LEVELS[raw] ?? LEVELS.info;
}

function write(level, msg, meta) {
  if ((LEVELS[level] ?? 99) > currentLevel()) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg: String(msg),
    ...(meta && typeof meta === 'object' ? meta : meta != null ? { meta } : {}),
  };
  const text = JSON.stringify(line);
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
}

export const logger = {
  error: (msg, meta) => write('error', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  debug: (msg, meta) => write('debug', msg, meta),
};
