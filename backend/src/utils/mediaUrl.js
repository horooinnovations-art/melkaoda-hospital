const API_PUBLIC =
  process.env.APP_URL ||
  process.env.PUBLIC_API_URL ||
  `http://localhost:${process.env.PORT || 5000}`;

/**
 * Host for relative `/storage/...` paths. Absolute remote storage URLs are
 * left alone so local API origin never rewrites working Render/CDN assets.
 */
const STORAGE_HOST = (
  process.env.MEDIA_STORAGE_HOST ||
  'https://deder.horooinnovations.com'
).replace(/\/$/, '');

/**
 * Mirror Deder StorageUrlHelper / Media::getUrlAttribute for the Node API:
 * rewrite broken localhost storage paths to the live file host, and undo
 * accidental Deder→Loke rebrand of CDN folder names (files still live under
 * `deder-hospital` on the shared Cloudinary account).
 */
export function normalizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;

  let next = url
    .replace(/\/loke-hospital\//g, '/deder-hospital/')
    .replace(/loke\.horooinnovations\.com/gi, 'deder.horooinnovations.com')
    .replace(/\/\/loke-hospital\./gi, '//deder-hospital.');

  // Absolute Cloudinary URLs are complete — leave them alone after folder fix.
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(next)) {
    return next;
  }

  // Prefer the always-on public storage host over cold Render dynos.
  next = next.replace(
    /https?:\/\/(?:loke-hospital-eb7x|deder-hospital-eb7x)\.onrender\.com/gi,
    'https://deder.horooinnovations.com'
  );

  // Absolute remote storage — keep the (possibly rewritten) host.
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
  return (
    typeof url === 'string' &&
    (/res\.cloudinary\.com/i.test(url) ||
      /deder\.horooinnovations\.com/i.test(url))
  );
}
