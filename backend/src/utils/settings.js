import { normalizeMediaUrl } from './mediaUrl.js';

/**
 * Split address fragments on commas and keep first occurrence of each token.
 * Fixes polluted values like:
 * "Siraro, Oromia, Ethiopia, Siraro, Oromia, Ethiopia, Siraro, Oromia"
 */
export function dedupeAddressTokens(parts) {
  const tokens = (Array.isArray(parts) ? parts : [parts])
    .filter((p) => p != null && String(p).trim() !== '')
    .flatMap((p) => String(p).split(/[,|;/]+/))
    .map((t) => t.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

  const seen = new Set();
  const result = [];
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(token);
  }
  return result;
}

export function formatAddress(...parts) {
  const tokens = dedupeAddressTokens(parts);
  return tokens.length ? tokens.join(', ') : undefined;
}

/**
 * Expose stable alias keys to the frontend while the `settings` table keeps the
 * column names it inherited from the original CMS schema.
 */
export function normalizeSettings(raw = {}) {
  const settings = { ...raw };

  const pick = (...keys) => {
    for (const key of keys) {
      const value = settings[key];
      if (value != null && String(value).trim() !== '') return value;
    }
    return undefined;
  };

  // Token-dedupe across all address fields (and inside each field). City/state/
  // country that were also pasted into line1 collapse to a single public line.
  const address = formatAddress(
    pick('address_line1', 'address'),
    pick('address_line2'),
    pick('city'),
    pick('state'),
    pick('zip_code'),
    pick('country')
  );

  // Surface a cleaned line1 so admin UI / next save does not keep growing junk.
  const cleanedLine1 = formatAddress(pick('address_line1', 'address'));
  if (cleanedLine1) settings.address_line1 = cleanedLine1;

  settings.site_name = pick('site_name', 'organization_name', 'name');
  settings.tagline = pick('tagline', 'organization_tagline');
  settings.about = pick('about', 'organization_description', 'description');
  settings.phone = pick('phone', 'contact_phone');
  settings.email = pick('email', 'contact_email');
  settings.emergency_phone = pick(
    'emergency_phone',
    'emergency_contact_phone',
    'phone',
    'contact_phone'
  );
  settings.address = address;
  settings.hours = pick(
    'hours',
    'working_hours',
    'working_hours_monday',
    'office_hours'
  );
  // Prefer composed day fields when a summary hours string is missing.
  if (!settings.hours) {
    const dayLabels = [
      ['hours_monday', 'Monday'],
      ['hours_tuesday', 'Tuesday'],
      ['hours_wednesday', 'Wednesday'],
      ['hours_thursday', 'Thursday'],
      ['hours_friday', 'Friday'],
      ['hours_saturday', 'Saturday'],
      ['hours_sunday', 'Sunday'],
    ];
    const lines = dayLabels
      .map(([key, label]) => {
        const v = pick(key, key.replace('hours_', 'working_hours_'));
        return v ? `${label}: ${v}` : null;
      })
      .filter(Boolean);
    if (lines.length) settings.hours = lines.join('\n');
  }
  // Expose day fields for admin Working Hours editors.
  for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
    const key = `hours_${day}`;
    settings[key] = pick(key, `working_hours_${day}`) ?? settings[key];
  }
  settings.mission = pick('mission', 'about_mission');
  settings.vision = pick('vision', 'about_vision');
  // The About page's "values" section is stored under core_values.
  settings.values = pick('core_values', 'values');
  settings.history = pick('history', 'about_history');
  settings.awards = pick('awards_accreditations', 'awards');
  // Keep DB keys mirrored so admin editors bound to schema keys stay filled
  if (settings.mission && !settings.about_mission) settings.about_mission = settings.mission;
  if (settings.vision && !settings.about_vision) settings.about_vision = settings.vision;
  if (settings.history && !settings.about_history) settings.about_history = settings.history;
  if (settings.values && !settings.core_values) settings.core_values = settings.values;
  if (settings.awards && !settings.awards_accreditations) {
    settings.awards_accreditations = settings.awards;
  }
  if (settings.about && !settings.organization_description) {
    settings.organization_description = settings.about;
  }
  settings.favicon_url = normalizeMediaUrl(pick('favicon_url', 'favicon'));
  settings.facebook = pick('facebook', 'social_facebook', 'facebook_url');
  settings.twitter = pick('twitter', 'social_twitter', 'twitter_url');
  settings.instagram = pick('instagram', 'social_instagram', 'instagram_url');
  settings.linkedin = pick('linkedin', 'social_linkedin', 'linkedin_url');
  settings.youtube = pick('youtube', 'social_youtube', 'youtube_url');
  settings.telegram = pick('telegram', 'social_telegram');
  settings.logo_url = normalizeMediaUrl(
    pick('logo_url', 'organization_logo')
  );
  settings.google_maps_url = pick('google_maps_url');
  settings.latitude = pick('latitude', 'lat');
  settings.longitude = pick('longitude', 'lng', 'lon');
  settings.founded_year = pick('founded_year');
  settings.website_url = pick('website_url', 'website');
  settings.total_patients = pick('total_patients');
  settings.years_experience = pick('years_experience');
  settings.registration_number = pick('registration_number');
  settings.tax_id = pick('tax_id');
  settings.license_number = pick('license_number');

  // No rebranding happens here any more. Rewriting stored text on the way out
  // meant the settings an editor saved and the settings the public saw were
  // different strings, and it corrupted any legitimate use of the words Deder,
  // Gambo or Loke — all three are real Ethiopian place names, and this
  // hospital's own address contains one (MEL2-BIZ-002). The rebrand is a
  // one-off data migration; see `npm run rebrand:melkaoda`.
  return settings;
}

/** Map frontend alias keys back to the stored schema keys for persistence. */
export function denormalizeSettingKey(key) {
  const map = {
    site_name: 'organization_name',
    tagline: 'organization_tagline',
    about: 'organization_description',
    phone: 'contact_phone',
    email: 'contact_email',
    address: 'address_line1',
    facebook: 'social_facebook',
    twitter: 'social_twitter',
    instagram: 'social_instagram',
    linkedin: 'social_linkedin',
    youtube: 'social_youtube',
    telegram: 'social_telegram',
    values: 'core_values',
    awards: 'awards_accreditations',
  };
  return map[key] || key;
}

/**
 * `rebrandText` has been removed along with the Deder→Loke script that was its
 * only caller. Rewriting sibling-hospital names is a one-off data migration and
 * now lives entirely in `scripts/rebrandToMelkaoda.js`, which owns its own copy
 * — nothing in the request path or the shared utilities refers to another
 * hospital's brand any more.
 */

/**
 * Returns candidate DB slugs for fallback matching if legacy slugs exist in DB.
 */
export function slugLookupCandidates(slug) {
  if (!slug || typeof slug !== 'string') return [slug];

  const candidates = [slug];
  for (const legacy of ['deder', 'gambo', 'loke']) {
    const candidate = slug.replace(/melkaoda/gi, legacy);
    if (candidate !== slug && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

/**
 * `rebrandContent` — a deep walk that rewrote every string of every public
 * response — has been removed (MEL2-BIZ-002). It made the API serve text that
 * differed from what was stored and what editors could see, and it cost a full
 * recursive regex pass on every public request. Rebranding is data work; do it
 * once with the migration script, not on the way out.
 */
