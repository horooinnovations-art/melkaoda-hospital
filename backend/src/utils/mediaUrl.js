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

  // Rewrite legacy storage domains (deder/loke/gambo/horooinnovations/onrender) to current STORAGE_HOST
  next = next.replace(
    /^https?:\/\/(?:[a-z0-9-]+\.)*(?:deder|loke|gambo)[-a-z0-9]*\.(?:onrender\.com|horooinnovations\.com)\/(storage|uploads)\//gi,
    `${STORAGE_HOST}/$1/`
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
