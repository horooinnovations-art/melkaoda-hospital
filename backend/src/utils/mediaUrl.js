const API_PUBLIC =
  process.env.APP_URL ||
  process.env.PUBLIC_API_URL ||
  `http://localhost:${process.env.PORT || 5000}`;

/**
 * Host for relative `/storage/...` paths.
 */
const STORAGE_HOST = (
  process.env.MEDIA_STORAGE_HOST ||
  API_PUBLIC
).replace(/\/$/, '');

export function normalizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;

  let next = url;

  // Absolute Cloudinary URLs are complete — leave them alone.
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(next)) {
    return next;
  }

  /**
   * A storage path on someone else's host is a stale reference. Re-point it.
   *
   * This used to match a hand-written list of hostnames — deder, loke, gambo —
   * which covered the sibling projects and missed this site's own former home.
   * The media table still holds rows like
   * `https://melkaoda-hospital-eb7x.onrender.com/storage/leadership/<file>`
   * from the Render deployment, and because that host is not in the list the
   * URL was published unchanged: pointing at an app that no longer exists, and
   * blocked by the site's own image policy before it could even fail.
   *
   * Media for this site lives on this account's disk. So any absolute URL whose
   * path is a `/storage/` or `/uploads/` path belongs here regardless of which
   * host it names, including the web host, which does not serve those paths at
   * all. Rewriting by path rather than by hostname also covers the next rename
   * without another edit.
   *
   * Cloudinary has already returned above: its URLs are not storage paths and
   * cannot be resolved this way.
   */
  next = next.replace(
    /^https?:\/\/[^/]+(\/(?:storage|uploads)\/[^\s]*)$/i,
    (_match, path) => `${STORAGE_HOST}${path}`
  );

  // Absolute remote storage — keep host if not a legacy host or local.
  if (
    /^https?:\/\//i.test(next) &&
    !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//i.test(next)
  ) {
    return next;
  }

  next = next.replace(
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/[^/]+\/public\/storage\//i,
    `${STORAGE_HOST}/storage/`
  );
  next = next.replace(
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/storage\//i,
    `${STORAGE_HOST}/storage/`
  );

  if (next.startsWith('storage/') || next.startsWith('/storage/')) {
    next = `${STORAGE_HOST}/${next.replace(/^\//, '')}`;
  }

  // Relative asset paths like /uploads/...
  if (next.startsWith('/') && !next.startsWith('//')) {
    const origin = API_PUBLIC.replace(/\/$/, '');
    return `${origin}${next}`;
  }

  return next;
}

/** Attach nested media object like Deder Eloquent `$doctor->photo->url`. */
export function nestMedia(row, flatKey, nestedKey = 'photo') {
  const url = normalizeMediaUrl(row[flatKey]);
  if (!url) {
    row[nestedKey] = null;
    return row;
  }
  row[flatKey] = url;
  row[nestedKey] = { url, id: row[`${nestedKey}_id`] || row.photo_id || null };
  return row;
}

/** Prefer CDN URLs that respond quickly over cold Render storage. */
export function isFastCdnUrl(url) {
  return typeof url === 'string' && /res\.cloudinary\.com/i.test(url);
}
