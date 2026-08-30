import { normalizeMediaUrl } from './mediaUrl.js';

/**
 * Split address fragments on commas and keep first occurrence of each token.
 * Fixes polluted values like:
 * "Loke, Siraro, Oromia, Ethiopia, Loke, Oromia, Ethiopia, Loke, Oromia, Ethiopia"
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
 * Normalize Deder/Loke settings keys so the frontend can use stable aliases
 * while the MySQL `settings` table keeps the original schema keys.
 * Also rebrands Deder → Loke in string values for API consumers.
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
  // Deder stores the About "values" section in core_values
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

  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'string') settings[key] = rebrandText(value);
  }

  return settings;
}

/** Map frontend alias keys back to Deder schema keys for persistence. */
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

export function rebrandText(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;

  // Never rewrite URLs / storage / CDN paths
  if (
    /^https?:\/\//i.test(value) ||
    value.includes('res.cloudinary.com') ||
    value.includes('/storage/') ||
    value.includes('cloudinary')
  ) {
    return value;
  }

  return value
    .replace(/Deder General Hospital/gi, 'Melka Oda General Hospital')
    .replace(/Gambo General Hospital/gi, 'Melka Oda General Hospital')
    .replace(/Loke General Hospital/gi, 'Melka Oda General Hospital')
    .replace(/Deder Hospital/gi, 'Melka Oda Hospital')
    .replace(/Gambo Hospital/gi, 'Melka Oda Hospital')
    .replace(/Loke Hospital/gi, 'Melka Oda Hospital')
    .replace(/Deder/g, 'Melka Oda')
    .replace(/Gambo/g, 'Melka Oda')
    .replace(/Loke/g, 'Melka Oda')
    .replace(/deder/g, 'melkaoda')
    .replace(/gambo/g, 'melkaoda')
    .replace(/loke/g, 'melkaoda');
}

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

/** Deep-walk objects/arrays and rebrand string fields (for API responses). */
export function rebrandContent(value) {
  if (typeof value === 'string') return rebrandText(value);
  if (Array.isArray(value)) return value.map(rebrandContent);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = rebrandContent(v);
    return out;
  }
  return value;
}
