import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
}

export function formatYear(date?: string | null) {
  if (!date) return "";
  return new Date(date).getFullYear().toString();
}

const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/**
 * Roman numerals for the ordinals on the home page boards, where the mark is
 * doing classical rather than arithmetic work. Falls back to a zero-padded
 * numeral past XXXIX, where roman runs wider than the column holding it — the
 * lists that use this are capped at ten, so that is a guard rather than a case
 * anyone sees.
 */
export function toRoman(value: number) {
  if (!Number.isFinite(value) || value < 1 || value > 39) {
    return String(value).padStart(2, "0");
  }
  let rest = Math.floor(value);
  let out = "";
  for (const [step, glyph] of ROMAN) {
    while (rest >= step) {
      out += glyph;
      rest -= step;
    }
  }
  return out;
}

/**
 * Cut to `length`, then back up to the last word boundary so the ellipsis never
 * lands mid-word ("…without bei…"). If the cut leaves no whitespace to fall back
 * to — a single very long token — the hard slice stands.
 */
export function truncate(text: string, length = 120) {
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = lastSpace > length * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${kept.replace(/[\s,;:.!?-]+$/, "").trim()}…`;
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Remove emoji / pictographs for cleaner marketing surfaces. */
export function stripEmoji(text: string) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean CMS display strings: strip html/emoji, fix common typos,
 * and drop trailing junk like "lll".
 */
export function cleanPublicText(text?: string | null) {
  if (!text) return "";
  let value = stripEmoji(stripHtml(String(text)));
  value = value.replace(/\bWellcome\b/gi, "Welcome");
  value = value.replace(/\bDeparments\b/gi, "Departments");
  value = value.replace(/\s+[a-z]{1,3}$/i, (tail) =>
    /^(lll|lll\.|xx|xxx|test)$/i.test(tail.trim()) ? "" : tail
  );
  value = value.replace(/\s{2,}/g, " ").trim();
  return value;
}

/**
 * The category a record actually belongs to, if it names one.
 *
 * Lists label each card with a kicker. That kicker was a constant per resource,
 * so every department on the listing read "Clinical unit" — all twenty-one of
 * them — while the database held ten real categories: Medical Department,
 * Pharmacy, Laboratory, Maintenance and the rest. A label identical on every
 * card tells the reader nothing and takes up the one line that could have.
 *
 * Resources store this differently, which is why the order below exists rather
 * than one field name: departments and news join a category record, partnership
 * and health-education hold a plain string, careers name a department, doctors
 * join one. Returns an empty string when a record genuinely has no category,
 * and the caller falls back to its generic label.
 *
 * `type` is last and deliberately narrow: on gallery it holds "image", which is
 * a storage detail and not a category, so it is only used when it reads like a
 * word rather than a file kind.
 */
const NON_CATEGORY_TYPES = /^(image|video|file|document|pdf|link|other|default)$/i;

export function recordCategoryLabel(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;

  const fromObject = (value: unknown): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      const name = (value as Record<string, unknown>).name;
      return typeof name === "string" ? name : "";
    }
    return "";
  };

  const candidates = [
    fromObject(row.category),
    typeof row.category_name === "string" ? row.category_name : "",
    fromObject(row.partnership_type),
    fromObject(row.department),
    typeof row.department_name === "string" ? row.department_name : "",
  ];

  for (const candidate of candidates) {
    const text = cleanPublicText(candidate);
    if (text) return text;
  }

  const type = cleanPublicText(fromObject(row.type));
  if (type && !NON_CATEGORY_TYPES.test(type)) return type;

  return "";
}

export type HoursRow = { day: string; hours: string };

/** Parse "Monday: 24 hrs Tuesday: 24 hrs…" into structured rows. */
export function parseHoursSchedule(raw?: string | null): HoursRow[] {
  if (!raw?.trim()) return [];
  const text = raw.replace(/\s+/g, " ").trim();

  // Already compact ("24/7", "Open 24 hours")
  if (/^24\s*\/\s*7|^open\s+24|^always/i.test(text) && !/monday/i.test(text)) {
    return [{ day: "Every day", hours: text }];
  }

  const dayPattern =
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[:\-–]?\s*/gi;
  const parts: { day: string; start: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = dayPattern.exec(text)) !== null) {
    parts.push({ day: match[1], start: match.index + match[0].length });
  }
  if (!parts.length) return [{ day: "Hours", hours: text }];

  return parts.map((part, i) => {
    const end = i + 1 < parts.length ? text.indexOf(parts[i + 1].day, part.start) : text.length;
    const hours = text.slice(part.start, end).replace(/^[:\-–]\s*/, "").trim() || "—";
    return { day: part.day.slice(0, 3), hours };
  });
}

/** True when every day is effectively 24 hours. */
export function isAlwaysOpen(raw?: string | null) {
  if (!raw) return false;
  if (/24\s*\/\s*7/i.test(raw)) return true;
  const rows = parseHoursSchedule(raw);
  return (
    rows.length >= 7 &&
    rows.every((r) => /24/.test(r.hours) && !/\d{1,2}:\d{2}\s*(am|pm)/i.test(r.hours))
  );
}

/**
 * A one-line opening-hours summary.
 *
 * The pages that show hours were printing the stored value verbatim behind the
 * words "Every day", so a week written out day by day came out as "Every day
 * Monday: 24hrs Tuesday: 24 hrs Wednesday: 24 hrs…" — a sentence that both
 * repeats itself and contradicts its own opening.
 *
 * Consecutive days that share hours are collapsed into a range, which is how
 * opening hours are written everywhere else: "Mon–Fri 08:00 – 17:00 · Sat
 * 08:00 – 12:00 · Sun Closed".
 */
export function summarizeHours(raw?: string | null): string {
  const rows = parseHoursSchedule(raw);
  if (!rows.length) return "";

  if (isAlwaysOpen(raw)) return "Open 24 hours, every day";

  // A value with no day names in it, e.g. "24hrs" or "By appointment".
  if (rows.length === 1 && /^(hours|every day)$/i.test(rows[0].day)) {
    return rows[0].hours;
  }

  const allSame = rows.every((r) => r.hours === rows[0].hours);
  if (allSame && rows.length >= 7) return `Every day ${rows[0].hours}`;

  const groups: { from: string; to: string; hours: string }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.hours === row.hours) last.to = row.day;
    else groups.push({ from: row.day, to: row.day, hours: row.hours });
  }

  return groups
    .map((g) => `${g.from === g.to ? g.from : `${g.from}–${g.to}`} ${g.hours}`)
    .join(" · ");
}

/* ─── Working hours ────────────────────────────────────────────────────────
   One stored string, edited either as a single value or as seven.

   The stored shape stays "Monday: … Tuesday: …" in both modes. The switch
   changes how the value is typed, not how it is saved, so the public side
   never has to handle two formats and turning the switch on and off cannot
   leave a half-migrated value behind.
   ------------------------------------------------------------------------ */
export const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

export type PerDayHours = Record<WeekDay, string>;

export const EMPTY_WEEK = () =>
  Object.fromEntries(WEEK_DAYS.map((d) => [d, ""])) as PerDayHours;

/**
 * Split a saved hours string into one entry per day.
 *
 * A value with no day names in it — "24hrs", which is what this field held
 * before it could hold anything else — is read as that value applying to every
 * day, so existing content opens in the editor instead of being discarded.
 */
export function splitHoursByDay(raw: string): PerDayHours {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  const out = EMPTY_WEEK();
  if (!text) return out;

  const marker = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[:\-–]?\s*/gi;
  const found: { day: WeekDay; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(text))) {
    const day = (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) as WeekDay;
    found.push({ day, start: m.index + m[0].length });
  }

  if (!found.length) {
    for (const day of WEEK_DAYS) out[day] = text;
    return out;
  }

  found.forEach((entry, i) => {
    const end =
      i + 1 < found.length
        ? text.indexOf(found[i + 1].day, entry.start)
        : text.length;
    out[entry.day] = text
      .slice(entry.start, end === -1 ? text.length : end)
      .replace(/^[:\-–]\s*/, "")
      .trim();
  });

  return out;
}

/** The shared value when every day matches, otherwise an empty string. */
export function commonHours(perDay: PerDayHours): string {
  const values = WEEK_DAYS.map((d) => perDay[d].trim());
  return values.every((v) => v === values[0]) ? values[0] : "";
}

/**
 * Serialise back to the stored form, from either editor.
 *
 * An entirely blank week is stored as an empty string rather than seven days
 * of "Closed": a hospital that has not filled this in yet should publish
 * nothing, not claim it is shut.
 */
export function buildHoursValue(input: string | PerDayHours): string {
  const perDay =
    typeof input === "string"
      ? (Object.fromEntries(WEEK_DAYS.map((d) => [d, input])) as PerDayHours)
      : input;

  if (WEEK_DAYS.every((d) => !perDay[d]?.trim())) return "";

  return WEEK_DAYS.map((d) => `${d}: ${perDay[d]?.trim() || "Closed"}`).join(" ");
}

/** Collapse repeated address tokens, e.g. "Siraro, Oromia, Siraro, Oromia". */
export function formatPublicAddress(
  ...parts: Array<string | null | undefined>
): string | undefined {
  const tokens = parts
    .filter((p): p is string => Boolean(p && String(p).trim()))
    .flatMap((p) => String(p).split(/[,|;/]+/))
    .map((t) => t.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(token);
  }
  return unique.length ? unique.join(", ") : undefined;
}

/** Check if a public resource record is active and allowed to show publicly. */
export function isPublicItemActive(item: Record<string, unknown> | null | undefined): boolean {
  if (!item || typeof item !== "object") return false;

  const isActive = item.is_active;
  if (isActive === false || isActive === 0 || isActive === "0" || isActive === "false") {
    return false;
  }

  const isPublished = item.is_published;
  if (isPublished === false || isPublished === 0 || isPublished === "0" || isPublished === "false") {
    return false;
  }

  const isVisible = item.is_visible;
  if (isVisible === false || isVisible === 0 || isVisible === "0" || isVisible === "false") {
    return false;
  }

  if (typeof item.status === "string") {
    const s = item.status.toLowerCase().trim();
    if (
      s === "draft" ||
      s === "inactive" ||
      s === "archived" ||
      s === "hidden" ||
      s === "disabled" ||
      s === "suspended" ||
      s === "closed"
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Human-readable file size for the Downloads page.
 *
 * `downloads.file_size` arrives as a string from MySQL BIGINT, so the numeric
 * coercion is not optional. Returns "" for missing / zero rather than "0 B" —
 * a download whose size was never recorded should print nothing at all.
 */
export function formatFileSize(bytes?: number | string | null): string {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // Bytes and KB are whole numbers; MB upward keeps one decimal.
  const rounded = unit <= 1 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/**
 * A tenure date as a timestamp. Accepts a full date or a bare year, since both
 * appear in the records. Null when there is nothing usable.
 */
function tenureTime(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}$/.test(text)) return Date.UTC(Number(text), 0, 1);
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : time;
}

/**
 * Leadership history order: the serving leader first, then most recent tenure
 * down to the earliest.
 *
 * Shared by the public timeline and the admin table so the two cannot disagree.
 * "Serving" means no tenure end, which is also how both pages mark it. Records
 * with no start date go last rather than being treated as the oldest, and ties
 * fall back to the editor's display order.
 */
export function compareTenureNewestFirst(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): number {
  const aServing = !a.tenure_end;
  const bServing = !b.tenure_end;
  if (aServing !== bServing) return aServing ? -1 : 1;

  const aStart = tenureTime(a.tenure_start);
  const bStart = tenureTime(b.tenure_start);
  if (aStart !== bStart) {
    if (aStart === null) return 1;
    if (bStart === null) return -1;
    return bStart - aStart;
  }

  const orderDiff = Number(a.order ?? 0) - Number(b.order ?? 0);
  if (orderDiff) return orderDiff;
  return Number(b.id ?? 0) - Number(a.id ?? 0);
}
