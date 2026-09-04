import readline from 'readline';

/**
 * Confirmation gate for the scripts that rewrite content in bulk.
 *
 * `backend/.env` points at the production database, and these scripts issue
 * unbounded `UPDATE`s across content tables with no dry run and no prompt —
 * `npm run rebrand:melkaoda` from a developer's machine rewrites live hospital
 * content (MEL2-OPS-001). Nothing about the command name warns you.
 *
 * Every mutating script now calls this first. It refuses outright unless the
 * operator passes `--confirm`, and when the target looks like the production
 * database it also requires the database name to be typed back.
 */

/** Hosts that are unambiguously not a developer's own machine. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);

export function looksLikeProduction() {
  const host = String(process.env.DB_HOST || '').trim().toLowerCase();
  if (!host) return false;
  if (LOCAL_HOSTS.has(host)) return false;
  return true;
}

function ask(questionText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(questionText, (answer) => {
      rl.close();
      resolve(String(answer || '').trim());
    });
  });
}

/**
 * @param {string} description  what the script is about to do, in one line
 */
export async function confirmDestructive(description) {
  const argv = process.argv.slice(2);
  const confirmed = argv.includes('--confirm');
  const dryRun = argv.includes('--dry-run');
  const database = process.env.DB_DATABASE || '(unset)';
  const host = process.env.DB_HOST || '(unset)';

  if (dryRun) {
    console.log(`[guard] --dry-run: no writes will be made.`);
    return { dryRun: true };
  }

  console.log('');
  console.log('  ' + description);
  console.log(`  target: ${database} @ ${host}`);
  console.log('');

  if (!confirmed) {
    console.error(
      '[guard] Refusing to run without --confirm.\n' +
        '        Re-run with --dry-run to see what it would change, or --confirm to proceed.'
    );
    process.exit(1);
  }

  if (looksLikeProduction()) {
    console.warn(
      '[guard] This looks like a REMOTE database. If it is production, these changes are ' +
        'immediate and there is no undo.'
    );
    if (!process.stdin.isTTY) {
      console.error(
        '[guard] Refusing to run non-interactively against a remote database. ' +
          'Run it from a terminal so the target can be confirmed.'
      );
      process.exit(1);
    }
    const typed = await ask(`[guard] Type the database name (${database}) to continue: `);
    if (typed !== database) {
      console.error('[guard] Name did not match. Nothing was changed.');
      process.exit(1);
    }
  }

  return { dryRun: false };
}
