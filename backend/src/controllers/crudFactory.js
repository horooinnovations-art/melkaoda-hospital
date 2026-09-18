import { query, queryOne } from '../config/db.js';
import { ok, fail, created, message, slugify, toBool, paginate, parseJsonField, serverError } from '../utils/helpers.js';
import { attachPhoto, attachPhotos, saveMedia } from '../services/media.js';
import { slugLookupCandidates } from '../utils/settings.js';
import { logAudit } from '../services/audit.js';
import {
  assertSafeIdent,
  getColumnInfo,
  getWritableColumns,
  normalizeEmptyValues,
  pickAllowedFields,
} from '../utils/sqlSafe.js';
import { excerptRows } from '../utils/excerpt.js';

/**
 * Generic CRUD factory for soft-deletable CMS tables sharing common patterns.
 */
export function createCrud(config) {
  const {
    table,
    softDelete = true,
    slugFrom,
    mediaField,
    mediaFolder = 'general',
    mediaAs = 'photo',
    publicFilter = '',
    orderBy = '`order` ASC, id DESC',
    mapIncoming,
    afterSave,
    afterFetch,
    jsonFields = [],
    searchable = [],
    /** Optional extra restriction on top of schema columns */
    allowedColumns = null,
    /**
     * Columns never returned on a public endpoint.
     *
     * Public list and detail used to be `SELECT *` — the same query as the
     * admin one with an extra WHERE clause — so the public contract was
     * "whatever the table happens to hold". Nothing sensitive was exposed, but
     * a column added later would be published the moment it existed, with no
     * code change to review (MEL2-API-003). These are stripped after the row is
     * fetched, so filters and media joins still see the full row.
     */
    publicHidden = [],
    /**
     * Body fields reduced to a plain-text excerpt on public LIST responses.
     *
     * A list endpoint is read to build cards: a name, a thumbnail, a sentence.
     * It was returning every record's complete article as well. /departments
     * answered with 221 KB across 21 records, of which 196 KB was `description`
     * — the full rich text of every department, fetched to render a grid that
     * shows two lines of each. The browser then parsed all of it, which is what
     * made the listings and the home page feel slow on a real connection.
     *
     * Excerpting rather than dropping the field: the cards fall back to
     * `description` when `short_description` is empty, which on the live data is
     * most of them, so removing it outright would empty the cards.
     *
     * The DETAIL endpoint is untouched and still returns the whole body.
     */
    publicListExcerpt = [],
    publicListExcerptLength = 320,
  } = config;

  /**
   * Internal bookkeeping no public consumer has a use for.
   *
   * `meta_title` / `meta_description` are deliberately absent: they are SEO
   * fields an editor authors *for* the public page, so hiding them would remove
   * the only thing they exist to do.
   */
  const ALWAYS_HIDDEN_PUBLICLY = [
    'created_by',
    'updated_by',
    'author_id',
    'reviewed_by',
    'deleted_at',
    'ip_address',
  ];

  const publicHiddenSet = new Set([...ALWAYS_HIDDEN_PUBLICLY, ...publicHidden]);

  function stripForPublic(row) {
    if (!row) return row;
    for (const key of publicHiddenSet) delete row[key];
    return row;
  }

  /** Shorten the configured body fields on a public list row. */
  function excerptForPublicList(row) {
    if (!row || !publicListExcerpt.length) return row;
    excerptRows([row], publicListExcerpt, publicListExcerptLength);
    return row;
  }

  assertSafeIdent(table, 'table name');
  const deletedClause = softDelete ? 'AND deleted_at IS NULL' : '';
  const modelType = table;

  function stripSensitive(row) {
    if (!row) return row;
    const copy = { ...row };
    delete copy.password;
    delete copy.remember_token;
    return copy;
  }

  /**
   * Keep only writable schema columns, then resolve emptied fields.
   * `mode` matters: an empty field on update means "clear this", on create
   * it means "not given" — see normalizeEmptyValues.
   */
  async function sanitizeIncoming(raw, mode = 'create') {
    const schemaCols = await getWritableColumns(table);
    const picked = pickAllowedFields(raw, schemaCols, allowedColumns);
    return normalizeEmptyValues(picked, await getColumnInfo(table), mode);
  }

  async function list(req, res, { isPublic = false } = {}) {
    try {
      const { page, perPage, offset } = paginate(req.query);
      const where = ['1=1'];
      if (softDelete) where.push('deleted_at IS NULL');
      if (isPublic && publicFilter) where.push(publicFilter);

      if (req.query.search && searchable.length) {
        const parts = searchable
          .filter((c) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(c))
          .map((c) => `\`${c}\` LIKE :search`);
        if (parts.length) where.push(`(${parts.join(' OR ')})`);
      }

      const params = {};
      if (req.query.search) params.search = `%${req.query.search}%`;
      if (req.query.department_id) {
        where.push('department_id = :department_id');
        params.department_id = req.query.department_id;
      }
      if (req.query.status) {
        where.push('status = :status');
        params.status = req.query.status;
      }
      if (req.query.category_id) {
        where.push('category_id = :category_id');
        params.category_id = req.query.category_id;
      }
      if (req.query.type) {
        where.push('type = :type');
        params.type = req.query.type;
      }

      const whereSql = where.join(' AND ');
      const rows = await query(
        `SELECT * FROM \`${table}\` WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ${perPage} OFFSET ${offset}`,
        params
      );
      const totalRow = await queryOne(
        `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${whereSql}`,
        params
      );

      for (const row of rows) {
        for (const f of jsonFields) row[f] = parseJsonField(row[f], row[f]);
      }
      if (mediaField) await attachPhotos(rows, mediaField, mediaAs);
      if (afterFetch) await afterFetch(rows, req);
      if (isPublic) {
        rows.forEach(stripForPublic);
        rows.forEach(excerptForPublicList);
      }

      return ok(res, { data: rows, meta: { total: totalRow.total, page, perPage } });
    } catch (err) {
      return serverError(res, err);
    }
  }

  async function show(req, res, { isPublic = false } = {}) {
    try {
      const bySlug = Number.isNaN(Number(req.params.id));
      const filterClause = isPublic && publicFilter ? `AND ${publicFilter}` : '';
      let row = null;

      if (bySlug) {
        for (const candidate of slugLookupCandidates(req.params.id)) {
          row = await queryOne(
            `SELECT * FROM \`${table}\` WHERE LOWER(slug) = LOWER(:id) ${deletedClause} ${filterClause} LIMIT 1`,
            { id: candidate }
          );
          if (row) break;
        }
      } else {
        row = await queryOne(
          `SELECT * FROM \`${table}\` WHERE id = :id ${deletedClause} ${filterClause} LIMIT 1`,
          { id: req.params.id }
        );
      }

      if (!row) return fail(res, 'Not found', 404);
      for (const f of jsonFields) row[f] = parseJsonField(row[f], row[f]);
      if (mediaField) await attachPhoto(row, mediaField, mediaAs);
      if (afterFetch) await afterFetch([row], req);
      if (isPublic) stripForPublic(row);
      return ok(res, row);
    } catch (err) {
      return serverError(res, err);
    }
  }

  async function store(req, res) {
    try {
      let data = { ...(req.body || {}) };
      if (mapIncoming) data = await mapIncoming(data, req, 'create');
      const mappedData = { ...data };
      data = await sanitizeIncoming(data);

      if (slugFrom && !data.slug) data.slug = slugify(data[slugFrom] || data.name || data.title);
      if (data.slug) {
        const exists = await queryOne(`SELECT id FROM \`${table}\` WHERE slug = :slug LIMIT 1`, {
          slug: data.slug,
        });
        if (exists) data.slug = `${data.slug}-${Date.now()}`;
      }

      if (req.file && mediaField) {
        const media = await saveMedia(req.file, req.user?.id, mediaFolder);
        data[mediaField] = media.id;
      }

      for (const f of jsonFields) {
        if (data[f] != null && typeof data[f] === 'object') data[f] = JSON.stringify(data[f]);
      }

      for (const key of Object.keys(data)) {
        if (key.startsWith('is_') || key === 'requires_appointment') {
          data[key] = toBool(data[key]) ? 1 : 0;
        }
      }

      // Drop any non-schema keys again after derived slug/media/bools
      data = await sanitizeIncoming(data);

      const cols = Object.keys(data).filter((k) => data[k] !== undefined);
      if (!cols.length) return fail(res, 'No data provided', 422);

      const colSql = cols.map((c) => `\`${c}\``).join(', ');
      const valSql = cols.map((c) => `:${c}`).join(', ');
      const params = Object.fromEntries(cols.map((c) => [c, data[c]]));

      const result = await query(
        `INSERT INTO \`${table}\` (${colSql}, created_at, updated_at) VALUES (${valSql}, NOW(), NOW())`,
        params
      );
      const row = await queryOne(`SELECT * FROM \`${table}\` WHERE id = :id`, { id: result.insertId });
      if (afterSave) await afterSave(row, mappedData, req, 'create');
      if (mediaField) await attachPhoto(row, mediaField, mediaAs);
      if (afterFetch) await afterFetch([row], req);
      await logAudit(req, 'create', {
        modelType,
        modelId: row?.id,
        newValues: stripSensitive(row),
      });
      return created(res, row);
    } catch (err) {
      return serverError(res, err);
    }
  }

  async function update(req, res) {
    try {
      const existing = await queryOne(
        `SELECT * FROM \`${table}\` WHERE id = :id ${deletedClause} LIMIT 1`,
        { id: req.params.id }
      );
      if (!existing) return fail(res, 'Not found', 404);

      let data = { ...(req.body || {}) };
      if (mapIncoming) data = await mapIncoming(data, req, 'update');
      const mappedData = { ...data };

      if (req.file && mediaField) {
        const media = await saveMedia(req.file, req.user?.id, mediaFolder);
        data[mediaField] = media.id;
      }

      for (const f of jsonFields) {
        if (data[f] != null && typeof data[f] === 'object') data[f] = JSON.stringify(data[f]);
      }
      for (const key of Object.keys(data)) {
        if (key.startsWith('is_') || key === 'requires_appointment') {
          data[key] = toBool(data[key]) ? 1 : 0;
        }
      }

      data = await sanitizeIncoming(data, 'update');

      const cols = Object.keys(data).filter((k) => data[k] !== undefined);
      if (!cols.length && !req.file && !afterSave) return fail(res, 'No data provided', 422);

      if (cols.length) {
        const sets = cols.map((c) => `\`${c}\` = :${c}`).join(', ');
        const params = Object.fromEntries(cols.map((c) => [c, data[c]]));
        params.id = req.params.id;
        await query(`UPDATE \`${table}\` SET ${sets}, updated_at = NOW() WHERE id = :id`, params);
      }

      const row = await queryOne(`SELECT * FROM \`${table}\` WHERE id = :id`, { id: req.params.id });
      if (afterSave) await afterSave(row, mappedData, req, 'update');
      if (mediaField) await attachPhoto(row, mediaField, mediaAs);
      if (afterFetch) await afterFetch([row], req);
      await logAudit(req, 'update', {
        modelType,
        modelId: row?.id,
        oldValues: stripSensitive(existing),
        newValues: stripSensitive(row),
      });
      return ok(res, row);
    } catch (err) {
      return serverError(res, err);
    }
  }

  async function destroy(req, res) {
    try {
      const existing = await queryOne(
        `SELECT * FROM \`${table}\` WHERE id = :id ${deletedClause} LIMIT 1`,
        { id: req.params.id }
      );
      if (!existing) return fail(res, 'Not found', 404);

      if (softDelete) {
        await query(`UPDATE \`${table}\` SET deleted_at = NOW() WHERE id = :id`, { id: req.params.id });
      } else {
        await query(`DELETE FROM \`${table}\` WHERE id = :id`, { id: req.params.id });
      }
      await logAudit(req, 'delete', {
        modelType,
        modelId: existing.id,
        oldValues: stripSensitive(existing),
      });
      return message(res, 'Deleted successfully');
    } catch (err) {
      return serverError(res, err);
    }
  }

  return {
    list: (req, res) => list(req, res, { isPublic: false }),
    listPublic: (req, res) => list(req, res, { isPublic: true }),
    show: (req, res) => show(req, res, { isPublic: false }),
    showPublic: (req, res) => show(req, res, { isPublic: true }),
    store,
    update,
    destroy,
  };
}
