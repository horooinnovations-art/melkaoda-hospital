/**
 * The site's own section index.
 *
 * Every interior masthead prints an ordinal beside the hospital's name and a
 * group name in its breadcrumb trail. Both come from here rather than from
 * nineteen hard-coded strings at the call sites, and the order is the order
 * `NovaHeader` already puts these pages in — so "09" under Services is the
 * page's real position in the navigation, not decoration.
 *
 * Keep this in step with the nav groups in `components/nova/NovaHeader.tsx`.
 */

export type SectionGroup = "The Hospital" | "Care" | "Newsroom" | "Visit";

export interface SectionEntry {
  /** Position in the navigation, zero-padded. Printed in the masthead. */
  ordinal: string;
  group: SectionGroup;
  /** Canonical name of the section, for a breadcrumb on a detail page. */
  label: string;
  /** Canonical route, so that breadcrumb can link. */
  path: string;
}

const ORDER: Array<[string, SectionGroup, string]> = [
  ["/about", "The Hospital", "About"],
  ["/leadership", "The Hospital", "Leadership"],
  ["/leadership/history", "The Hospital", "Leadership History"],
  ["/partnerships", "The Hospital", "Partnerships"],
  ["/testimonials", "The Hospital", "Patient Stories"],
  ["/gallery", "The Hospital", "Gallery"],
  ["/faqs", "The Hospital", "FAQs"],
  ["/departments", "Care", "Departments"],
  ["/services", "Care", "Services"],
  ["/doctors", "Care", "Doctors"],
  ["/emergency", "Care", "Emergency"],
  ["/insurance", "Care", "Insurance"],
  ["/health-education", "Care", "Health Education"],
  ["/news", "Newsroom", "News"],
  ["/announcements", "Newsroom", "Announcements"],
  ["/events", "Newsroom", "Events"],
  ["/careers", "Newsroom", "Careers"],
  ["/contact", "Visit", "Contact"],
];

const INDEX: Record<string, SectionEntry> = Object.fromEntries(
  ORDER.map(([path, group, label], i) => [
    path,
    { ordinal: String(i + 1).padStart(2, "0"), group, label, path },
  ])
);

/**
 * Resolves a route to its section entry. A detail route falls back to its
 * parent section, so /news/some-story is still "14 · Newsroom" — the longest
 * matching prefix wins, which is what keeps /leadership/history distinct from
 * /leadership.
 */
export function sectionMeta(path?: string | null): SectionEntry | undefined {
  if (!path) return undefined;
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";
  if (INDEX[clean]) return INDEX[clean];

  let best: SectionEntry | undefined;
  let bestLength = 0;
  for (const [key, entry] of Object.entries(INDEX)) {
    if (clean.startsWith(`${key}/`) && key.length > bestLength) {
      best = entry;
      bestLength = key.length;
    }
  }
  return best;
}

export const SECTION_COUNT = ORDER.length;
