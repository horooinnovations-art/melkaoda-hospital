/**
 * Structural parsing for the About page's rich-text settings.
 *
 * The editor saves real HTML — headings, `<strong>` runs, `<hr>` rules — and the
 * previous parsers threw all of it away, stripped the tags to plain lines, and
 * tried to guess the structure back from line lengths. A line became a card
 * title only if the line after it was longer than forty characters.
 *
 * On the live content that produced, from ten uniformly-structured values, six
 * cards and 1,671 characters dumped into the section intro — the same text
 * rendered twice, once as cards and once as an unstructured wall. Which values
 * survived depended on whether their one-line statement happened to exceed the
 * threshold.
 *
 * These parsers read the markup instead. The heuristics remain underneath as a
 * fallback, because content written before the editor existed is still plain
 * text and must keep rendering.
 */

export type ValueItem = {
  emoji?: string;
  title: string;
  /** The short bold statement shown under the title. */
  description: string;
  /** Any longer explanatory copy the author wrote beneath the statement. */
  body?: string;
};

export type Section = {
  heading: string;
  level: number;
  /** Inner HTML of everything between this heading and the next. */
  html: string;
};

const BLOCK_CLOSE = /<\/(p|div|h[1-6]|li|tr)\s*>/gi;
const BREAK = /<br\s*\/?>/gi;

/** Strip tags to readable text, preserving block boundaries as newlines. */
export function htmlToText(raw: string): string {
  return String(raw ?? '')
    .replace(BLOCK_CLOSE, '\n')
    .replace(BREAK, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Readable, whitespace-collapsed lines. */
export function htmlToLines(raw: string): string[] {
  return htmlToText(raw)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** True when the markup carries structure worth reading rather than guessing. */
export function hasHtmlStructure(raw: unknown): raw is string {
  return typeof raw === 'string' && /<(h[1-6]|hr|strong|b)\b/i.test(raw);
}

/**
 * Split on `<hr>` rules. Editors use a horizontal rule as a record separator,
 * which makes it the most reliable delimiter available when it is present.
 */
export function splitOnRules(raw: string): string[] {
  return String(raw)
    .split(/<hr\s*\/?>/i)
    .map((block) => block.trim())
    .filter((block) => htmlToText(block).trim().length > 0);
}

/** Text of each `<strong>` / `<b>` run, in order. */
export function strongRuns(html: string): string[] {
  const out: string[] = [];
  const re = /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = htmlToText(m[2]).replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }
  return out;
}

/**
 * Split HTML into heading-delimited sections. Anything before the first heading
 * is returned with an empty heading, which is how the callers recover the intro
 * without it swallowing the body of every later section.
 */
export function splitOnHeadings(raw: string): Section[] {
  const html = String(raw ?? '');
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  const sections: Section[] = [];
  let lastEnd = 0;
  let lastHeading: { text: string; level: number } | null = null;
  let m: RegExpExecArray | null;

  const push = (heading: string, level: number, body: string) => {
    if (!heading && !htmlToText(body).trim()) return;
    sections.push({ heading, level, html: body });
  };

  while ((m = re.exec(html))) {
    push(
      lastHeading?.text ?? '',
      lastHeading?.level ?? 0,
      html.slice(lastEnd, m.index)
    );
    lastHeading = {
      text: htmlToText(m[2]).replace(/\s+/g, ' ').trim(),
      level: Number(m[1]),
    };
    lastEnd = m.index + m[0].length;
  }
  push(lastHeading?.text ?? '', lastHeading?.level ?? 0, html.slice(lastEnd));

  return sections;
}

/**
 * Core values from structured markup.
 *
 * Each `<hr>`-delimited block is one value: the first bold run is the title,
 * the second is the short statement shown under it, and whatever is left is the
 * longer explanation. Returns null when the shape does not hold, so the caller
 * can fall back rather than render something worse.
 */
export function parseValuesStructured(
  raw: string
): { intro: string; items: ValueItem[] } | null {
  const blocks = splitOnRules(raw);
  // One block means no rules were used; there is nothing structural to read.
  if (blocks.length < 2) return null;

  const items: ValueItem[] = [];
  const introParts: string[] = [];

  for (const block of blocks) {
    const strongs = strongRuns(block);
    if (!strongs.length) {
      // A block with no bold run at all is prose — genuine intro copy.
      const text = htmlToText(block).replace(/\s+/g, ' ').trim();
      if (text) introParts.push(text);
      continue;
    }

    const title = strongs[0];
    const description = strongs[1] ?? '';

    /**
     * Everything that is not the title or the statement is the longer
     * explanation. The first two bold ELEMENTS are dropped positionally rather
     * than by matching their text: run text is entity-decoded, so a title like
     * "RESPECT & DIGNITY" would never match the `RESPECT &amp; DIGNITY` in the
     * markup, and the title ended up repeated at the head of its own body.
     */
    let dropped = 0;
    const rest = block.replace(
      /<(strong|b)\b[^>]*>[\s\S]*?<\/\1>/gi,
      (match) => (dropped++ < 2 ? '' : match)
    );
    const body = htmlToText(rest).replace(/\s+/g, ' ').trim();

    items.push({ title, description, body: body || undefined });
  }

  if (items.length < 2) return null;
  return { intro: introParts.join(' ').trim(), items };
}

/**
 * Intro copy, card sections and closing copy, for the History and Awards blocks.
 *
 * Both documents share one shape: a title, sometimes a subtitle, a run of
 * same-level headings that are the actual entries, and sometimes a closing line
 * or signature. So the entries are identified by heading LEVEL rather than by
 * "has a heading" — on the live Awards copy the five real awards are `h2` while
 * the subtitle above them and the signature below them are `h3`, and treating
 * every heading as an entry turned both of those into empty cards.
 *
 * Whatever sits before the first entry becomes the intro and whatever sits after
 * the last becomes the outro, so no authored copy is dropped. The previous
 * parser discarded the History subtitle entirely, because its body was empty.
 *
 * `skipHeading` drops the document's own title so it is not repeated above a
 * section that already displays it.
 */
export function parseHeadingSections(
  raw: string,
  skipHeading: RegExp
): { intro: string; sections: Section[]; outro: string } | null {
  const all = splitOnHeadings(raw);

  const text = (html: string) => htmlToText(html).replace(/\s+/g, ' ').trim();

  // An entry is a heading with copy under it. A heading with an empty body is
  // a subtitle, a closing line or a signature — never a card.
  const candidates = all.filter(
    (s) => s.heading && !skipHeading.test(s.heading) && text(s.html).length > 0
  );
  if (candidates.length < 2) return null;

  // The level that carries the most entries is the entry level. Ties keep the
  // level that appears first, which is the one the author opened the list with.
  const counts = new Map<number, number>();
  for (const s of candidates) counts.set(s.level, (counts.get(s.level) ?? 0) + 1);
  let entryLevel = candidates[0].level;
  for (const s of candidates) {
    if ((counts.get(s.level) ?? 0) > (counts.get(entryLevel) ?? 0)) entryLevel = s.level;
  }

  const sections = candidates.filter((s) => s.level === entryLevel);
  if (sections.length < 2) return null;

  const first = all.indexOf(sections[0]);
  const last = all.indexOf(sections[sections.length - 1]);

  /**
   * Heading and body of an out-of-band section. Pieces are joined with a blank
   * line rather than a space so the renderer can keep them as separate
   * paragraphs: a subtitle and the lead paragraph beneath it are not one
   * sentence, and running them together reads as a missing full stop.
   */
  const asProse = (s: Section) =>
    [skipHeading.test(s.heading) ? '' : s.heading, text(s.html)]
      .filter(Boolean)
      .join('\n\n');

  const join = (parts: Section[]) =>
    parts.map(asProse).filter(Boolean).join('\n\n').trim();

  /**
   * Everything after the last entry is closing copy. Entry-level headings are
   * included: one that lands here necessarily has an empty body, which is how a
   * closing sentence written as a heading reaches this point — filtering by
   * level silently dropped it.
   */
  const intro = join(all.slice(0, first));
  const outro = join(all.slice(last + 1));

  return { intro, sections, outro };
}

/**
 * A short, readable summary of a rich-text setting.
 *
 * The hospital's About text is a whole document: an `<h1>` with the hospital's
 * name, a bold strapline, an "About …" subheading, then the prose. The footer
 * blurb and the Contact hero were built by stripping the tags off all of that
 * and cutting the result to length, which produced
 *
 *   "MELKA ODA GENERAL HOSPITAL Caring for Every Life. Advancing Health.
 *    Strengthening Our Community. About Melka Oda General Hospital Melka Oda
 *    General Hospital is a public…"
 *
 * — the hospital named three times before the sentence begins, and cut off
 * before it says anything.
 *
 * Headings are dropped: they are titles, and the surface showing this summary
 * has a title of its own. A leading paragraph that is entirely bold is dropped
 * too, because that is a strapline, and the site prints the tagline separately.
 * What remains is the prose, from its first real sentence.
 */
export function summarizeRichText(raw: unknown, maxChars = 240): string {
  if (typeof raw !== 'string' || !raw.trim()) return '';

  // Headings and block quotes are display furniture around the prose.
  const body = raw
    .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, '')
    .replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, '');

  const paragraphs: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const inner = m[1];
    const text = htmlToText(inner).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    // Entirely bold, and nothing else in the paragraph: a strapline.
    const stripped = inner.replace(/<(strong|b)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    const isStrapline =
      paragraphs.length === 0 && !htmlToText(stripped).trim();
    if (isStrapline) continue;
    paragraphs.push(text);
  }

  // No paragraph markup at all: fall back to the readable lines.
  const parts = paragraphs.length ? paragraphs : htmlToLines(body);
  if (!parts.length) return '';

  let out = '';
  for (const part of parts) {
    if (!out) {
      out = part;
      continue;
    }
    if (out.length + 1 + part.length > maxChars) break;
    out = `${out} ${part}`;
  }

  if (out.length <= maxChars) return out;

  // Cut on a sentence if one ends in range, otherwise on a word.
  const window = out.slice(0, maxChars);
  const sentence = window.search(/[.!?](?=[^.!?]*$)/);
  if (sentence > maxChars * 0.5) return window.slice(0, sentence + 1);
  return `${window.slice(0, window.lastIndexOf(' ')).trimEnd()}…`;
}
