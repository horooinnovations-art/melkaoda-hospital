/**
 * Excerpting for list payloads.
 *
 * A list endpoint is read to build cards: a name, a thumbnail, a sentence. Ours
 * were returning every record's complete article as well. `/public/departments`
 * answered with 216 KB across 21 records, of which 191 KB was `description` —
 * the full rich text of every department, sent to render a grid that shows two
 * lines of each. `/public/home` did the same for the six departments, six
 * services, four doctors and the leadership it bundles.
 *
 * The browser pays for that twice: once on the wire, and again parsing markup
 * it will never display. That is what made listings and the home page feel slow
 * while the detail pages, which fetch one record, felt fine.
 *
 * Detail endpoints do not use any of this and still return the whole body.
 */

/**
 * The named entities a rich-text editor actually emits.
 *
 * Not a complete HTML entity table, deliberately — this exists to shorten a
 * sentence, and the alternative is pulling a parser in to do it. Anything not
 * listed is left exactly as written rather than mangled; numeric references are
 * handled separately below.
 */
const ENTITIES = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  middot: '·',
  deg: '°',
  times: '×',
};

/** Readable text from stored rich text. */
export function toPlainText(html) {
  return String(html ?? '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&([a-z]+);/gi, (match, name) => {
      const value = ENTITIES[String(name).toLowerCase()];
      return value === undefined ? match : value;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Plain text, cut to `limit` on a word boundary.
 *
 * Text already within the limit comes back whole, so a short description is
 * returned exactly as its author wrote it and only genuinely long bodies are
 * shortened.
 */
export function excerptText(html, limit = 320) {
  const text = toPlainText(html);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  const body = lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.trimEnd()}…`;
}

/**
 * Excerpt the named fields on each row, in place.
 *
 * Fields are excerpted rather than removed because the cards fall back to the
 * body when the short description is empty, which on the live data is most of
 * them — dropping the field would empty the cards it was meant to speed up.
 */
export function excerptRows(rows, fields, limit = 320) {
  if (!Array.isArray(rows) || !fields?.length) return rows;
  for (const row of rows) {
    if (!row) continue;
    for (const field of fields) {
      if (typeof row[field] !== 'string' || !row[field]) continue;
      row[field] = excerptText(row[field], limit);
    }
  }
  return rows;
}
