/**
 * Repair public-facing content gaps after Deder → Loke import.
 * - Restore soft-deleted published news
 * - Approve testimonials that were left unapproved
 * - Seed leadership_history from active leadership when archive is empty
 */
import dotenv from 'dotenv';
import pool from '../config/db.js';
import { confirmDestructive } from './_guard.js';

dotenv.config();

async function main() {
  // Refuses to run without --confirm, and makes a remote target be typed
  // back before touching it (MEL2-OPS-001).
  const { dryRun } = await confirmDestructive(
    'Repairs public content rows in bulk.'
  );
  if (dryRun) {
    console.log('[dry-run] No changes were made.');
    process.exit(0);
  }

  const [news] = await pool.query(
    `UPDATE news
     SET deleted_at = NULL
     WHERE status = 'published' AND deleted_at IS NOT NULL`
  );
  console.log(`✓ restored published news rows: ${news.affectedRows || 0}`);

  const [testimonials] = await pool.query(
    `UPDATE testimonials
     SET is_approved = 1
     WHERE is_approved = 0 AND content IS NOT NULL AND content <> ''`
  );
  console.log(`✓ approved testimonials: ${testimonials.affectedRows || 0}`);

  const [[{ total: historyCount }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM leadership_history WHERE deleted_at IS NULL`
  );

  if (Number(historyCount) === 0) {
    const [leaders] = await pool.query(
      `SELECT * FROM leadership WHERE deleted_at IS NULL AND is_active = 1 ORDER BY \`order\` ASC, id ASC`
    );
    let inserted = 0;
    for (const leader of leaders) {
      const slugBase = String(leader.slug || leader.name)
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const slug = `${slugBase}-history`;
      await pool.query(
        `INSERT INTO leadership_history
          (name, position, slug, bio, short_bio, photo_id, email, phone, tenure_start, tenure_end, achievements, education, \`order\`, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = NOW()`,
        [
          leader.name,
          leader.position || 'Leader',
          slug,
          leader.bio || null,
          leader.short_bio || null,
          leader.photo_id || null,
          leader.email || null,
          leader.phone || null,
          leader.created_at ? String(leader.created_at).slice(0, 10) : null,
          leader.certifications || null,
          leader.education || null,
          leader.order || 0,
        ]
      );
      inserted += 1;
    }
    console.log(`✓ seeded leadership_history from leadership: ${inserted}`);
  } else {
    console.log(`✓ leadership_history already has ${historyCount} rows`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Repair failed:', err.message);
  process.exit(1);
});
