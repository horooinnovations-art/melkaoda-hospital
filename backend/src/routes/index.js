import { safeRouter } from '../utils/asyncHandler.js';
import rateLimit from 'express-rate-limit';
import {
  login,
  logout,
  me,
  updateMe,
  updatePassword,
  dashboard,
  getSettings,
  updateSettings,
  submitContact,
  listContacts,
  replyContact,
  authenticate,
  requireRoles,
  requirePermission,
  requireSuperAdmin,
  upload,
} from '../controllers/core.js';
import * as R from '../controllers/resources.js';
import * as RBAC from '../controllers/rbac.js';
import * as SUB from '../controllers/submissions.js';
import * as PR from '../controllers/passwordReset.js';
import { RESOURCE_PERMISSIONS } from '../config/permissions.js';
import { saveMedia, destroyMedia } from '../services/media.js';
import { logAudit } from '../services/audit.js';
import { ok, fail, message, serverError } from '../utils/helpers.js';
import { normalizeSettings } from '../utils/settings.js';
import { normalizeMediaUrl, nestMedia, isFastCdnUrl } from '../utils/mediaUrl.js';
import { query, queryOne } from '../config/db.js';
import { excerptRows } from '../utils/excerpt.js';

const router = safeRouter();

/**
 * These key on req.ip, which is only the real client once `trust proxy` is set
 * in server.js (MEL-DEVOPS-001).
 */
const limiter = (max, windowMs = 60_000) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });

/**
 * Floor for everything under /api/v1.
 *
 * Only login, the two public forms and the download counter were limited, so
 * every public read endpoint and every admin endpoint was unmetered — free to
 * scrape and free to flood, on an instance where one home request costs ten
 * queries (MEL2-API-001). This sits high enough not to interfere with a person
 * browsing the site and low enough to blunt a script.
 */
const globalLimiter = limiter(300);
/** Admin traffic is a handful of operators, not the public. */
const adminLimiter = limiter(120);

const authLimiter = limiter(8);
const formLimiter = limiter(10);
/** Download-counter pings: a visitor may legitimately take several files. */
const trackLimiter = limiter(60);
/**
 * Credential and identity changes on one's own account. Previously unlimited,
 * which allowed unbounded current-password guessing and unbounded retries of the
 * profile edit that used to grant the privileged tier (MEL-SEC-010).
 */
const accountLimiter = limiter(10, 15 * 60_000);

/** Roles allowed into the admin panel. */
const PANEL_ROLES = ['admin', 'super_admin', 'editor', 'doctor', 'staff'];

function panelAuth(...permissions) {
  const chain = [adminLimiter, authenticate, requireRoles(...PANEL_ROLES)];
  if (permissions.length) chain.push(requirePermission(...permissions));
  return chain;
}

// Applies to every route below, public and admin alike.
router.use(globalLimiter);

function mountCrud(path, ctrl, { publicList = true, publicShow = true, fileField = 'photo' } = {}) {
  if (publicList) router.get(`/public/${path}`, ctrl.listPublic);
  if (publicShow) router.get(`/public/${path}/:id`, ctrl.showPublic);

  const permission = RESOURCE_PERMISSIONS[path];
  if (!permission) {
    throw new Error(`Missing RESOURCE_PERMISSIONS entry for "${path}"`);
  }

  router.get(`/admin/${path}`, ...panelAuth(permission), ctrl.list);
  router.get(`/admin/${path}/:id`, ...panelAuth(permission), ctrl.show);
  router.post(
    `/admin/${path}`,
    ...panelAuth(permission),
    upload.single(fileField),
    ctrl.store
  );
  router.put(
    `/admin/${path}/:id`,
    ...panelAuth(permission),
    upload.single(fileField),
    ctrl.update
  );
  router.post(
    `/admin/${path}/:id`,
    ...panelAuth(permission),
    upload.single(fileField),
    ctrl.update
  );
  router.delete(`/admin/${path}/:id`, ...panelAuth(permission), ctrl.destroy);
}

// Auth
router.post('/admin/login', authLimiter, login);
/**
 * Password reset. Rate-limited hard: the request endpoint sends mail and the
 * completion endpoint is a token guess. Both answer neutrally.
 */
router.post('/admin/password/forgot', limiter(5, 15 * 60_000), PR.requestPasswordReset);
router.post('/admin/password/reset', limiter(10, 15 * 60_000), PR.completePasswordReset);
router.post('/admin/logout', authenticate, logout);
router.get('/admin/me', authenticate, me);
router.put('/admin/me', authenticate, accountLimiter, upload.single('avatar'), updateMe);
router.put('/admin/me/password', authenticate, accountLimiter, updatePassword);
router.get('/admin/dashboard', ...panelAuth(), dashboard);

// Settings
router.get('/public/settings', getSettings);
router.get('/admin/settings', ...panelAuth('manage_settings'), getSettings);
router.post(
  '/admin/settings',
  ...panelAuth('manage_settings'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
  ]),
  updateSettings
);

// Contact
router.post('/public/contact', formLimiter, submitContact);
router.get('/admin/contact-submissions', ...panelAuth('manage_contact_submissions'), listContacts);
router.get('/admin/contact-submissions/:id', ...panelAuth('manage_contact_submissions'), async (req, res) => {
  const row = await queryOne(`SELECT * FROM contact_submissions WHERE id = :id`, { id: req.params.id });
  if (!row) return fail(res, 'Not found', 404);
  if (row.status === 'new') {
    await query(
      `UPDATE contact_submissions SET status = 'read', updated_at = NOW() WHERE id = :id AND status = 'new'`,
      { id: req.params.id }
    );
    row.status = 'read';
  }
  return ok(res, row);
});
router.post(
  '/admin/contact-submissions/:id/reply',
  ...panelAuth('manage_contact_submissions'),
  replyContact
);

// Media
router.get('/admin/media', ...panelAuth('manage_media'), R.listMedia);
router.post(
  '/admin/media/upload',
  ...panelAuth('manage_media'),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return fail(res, 'File required', 422);
    const media = await saveMedia(req.file, req.user.id, req.body.folder || 'general');
    return ok(res, media, 201);
  }
);
router.delete('/admin/media/:id', ...panelAuth('manage_media'), async (req, res) => {
  const media = await queryOne(`SELECT * FROM media WHERE id = :id LIMIT 1`, {
    id: req.params.id,
  });
  if (!media) return fail(res, 'Not found', 404);
  // Résumés are applicant PII and are managed from the applications screen, not
  // the media library — deleting one here would orphan an application's file.
  if (media.folder === 'resumes') {
    return fail(res, 'Applicant files are managed from Job Applications', 403);
  }
  // Removes the Cloudinary asset too. This used to drop only the row, leaving
  // the remote file paid for and unreferenced forever, with no audit entry.
  await destroyMedia(media);
  await logAudit(req, 'delete', {
    modelType: 'media',
    modelId: media.id,
    oldValues: { id: media.id, url: media.url, folder: media.folder },
  });
  return ok(res, { message: 'Deleted' });
});

/**
 * Job applications and event registrations.
 *
 * Both tables were written by the public forms and read by nothing — no route,
 * no page, no export (MEL2-BIZ-001). Applications sit behind `manage_careers`
 * and registrations behind `manage_events`, matching the permission that
 * governs the vacancy or event they belong to.
 *
 * The résumé download is a separate, audited endpoint: it returns a signed
 * five-minute URL rather than putting a link to applicant PII in every list
 * payload.
 */
router.get('/admin/job-applications', ...panelAuth('manage_careers'), SUB.listApplications);
router.get('/admin/job-applications/:id', ...panelAuth('manage_careers'), SUB.showApplication);
router.get(
  '/admin/job-applications/:id/resume',
  ...panelAuth('manage_careers'),
  SUB.downloadResume
);
router.put('/admin/job-applications/:id', ...panelAuth('manage_careers'), SUB.updateApplication);
router.post('/admin/job-applications/:id', ...panelAuth('manage_careers'), SUB.updateApplication);

router.get('/admin/event-registrations', ...panelAuth('manage_events'), SUB.listRegistrations);
router.put('/admin/event-registrations/:id', ...panelAuth('manage_events'), SUB.updateRegistration);
router.post('/admin/event-registrations/:id', ...panelAuth('manage_events'), SUB.updateRegistration);

router.get('/admin/audit-logs', ...panelAuth('view_audit_logs'), R.listAuditLogs);
router.get('/admin/audit-logs/:id', ...panelAuth('view_audit_logs'), R.showAuditLog);

// Admin form select options used by the CRUD dialogs.
router.get('/admin/department-options', ...panelAuth(), R.listDepartmentOptions);
router.get('/admin/department-category-options', ...panelAuth(), R.listDepartmentCategoryOptions);
router.get('/admin/doctor-options', ...panelAuth(), R.listDoctorOptions);
router.get('/admin/specialization-options', ...panelAuth(), R.listSpecializationOptions);
router.get('/admin/category-options', ...panelAuth(), R.listCategoryOptions);

// Resources
mountCrud('departments', R.departments, { fileField: 'featured_image' });
mountCrud('department-categories', R.departmentCategories, { fileField: 'icon' });
mountCrud('partnership-categories', R.partnershipCategories);
mountCrud('partnerships', R.partnerships, { fileField: 'logo' });
mountCrud('doctors', R.doctors, { fileField: 'photo' });
mountCrud('services', R.services, { fileField: 'featured_image' });
mountCrud('specializations', R.specializations);
mountCrud('leadership', R.leadership, { fileField: 'photo' });
mountCrud('leadership-history', R.leadershipHistory, { fileField: 'photo' });
mountCrud('news', R.news, { fileField: 'featured_image' });
mountCrud('announcements', R.announcements, { fileField: 'featured_image' });
mountCrud('gallery', R.gallery, { fileField: 'media_file' });
mountCrud('pages', R.pages, { fileField: 'featured_image' });
mountCrud('events', R.events, { fileField: 'featured_image' });
mountCrud('careers', R.careers, { fileField: 'file' });
mountCrud('testimonials', R.testimonials, { fileField: 'patient_photo' });
mountCrud('faqs', R.faqs, { fileField: 'file' });
mountCrud('downloads', R.downloads, { fileField: 'file' });
mountCrud('insurance', R.insurance, { fileField: 'logo' });
mountCrud('emergency-services', R.emergencyServices, { fileField: 'featured_image' });
mountCrud('health-education', R.healthEducation, { fileField: 'featured_image' });

router.get(
  '/admin/partnership-category-options',
  ...panelAuth('manage_pages'),
  R.listPartnershipCategories
);

// Users / Roles / Permissions — RBAC admin
router.get('/admin/users', ...panelAuth('manage_users'), RBAC.listUsers);
router.get('/admin/users/:id', ...panelAuth('manage_users'), RBAC.showUser);
router.post('/admin/users', ...panelAuth('manage_users'), RBAC.createUser);
router.put('/admin/users/:id', ...panelAuth('manage_users'), RBAC.updateUser);
router.post('/admin/users/:id', ...panelAuth('manage_users'), RBAC.updateUser);
router.delete('/admin/users/:id', ...panelAuth('manage_users'), RBAC.destroyUser);

router.get('/admin/roles', ...panelAuth('manage_roles'), RBAC.listRoles);
router.get('/admin/roles/:id', ...panelAuth('manage_roles'), RBAC.showRole);
router.post('/admin/roles', ...panelAuth('manage_roles'), RBAC.createRole);
router.put('/admin/roles/:id', ...panelAuth('manage_roles'), RBAC.updateRole);
router.post('/admin/roles/:id', ...panelAuth('manage_roles'), RBAC.updateRole);
router.delete('/admin/roles/:id', authenticate, requireSuperAdmin, RBAC.destroyRole);

router.get(
  '/admin/permissions/grouped',
  ...panelAuth('manage_roles'),
  RBAC.permissionsGrouped
);
router.get('/admin/permissions', authenticate, requireSuperAdmin, RBAC.listPermissions);
router.get('/admin/permissions/:id', authenticate, requireSuperAdmin, RBAC.showPermission);
router.post('/admin/permissions', authenticate, requireSuperAdmin, RBAC.createPermission);
router.put('/admin/permissions/:id', authenticate, requireSuperAdmin, RBAC.updatePermission);
router.post('/admin/permissions/:id', authenticate, requireSuperAdmin, RBAC.updatePermission);
router.delete('/admin/permissions/:id', authenticate, requireSuperAdmin, RBAC.destroyPermission);

// Public forms
router.post('/public/careers/:slug/apply', formLimiter, upload.single('resume'), R.applyCareer);
router.post('/public/events/:slug/register', formLimiter, R.registerEvent);
router.post('/public/downloads/:id/track', trackLimiter, R.trackDownload);

// Short in-memory cache so navigations / revalidates don't re-hit every table.
let homeCache = { at: 0, payload: null };
const HOME_CACHE_MS = 60_000;

// Home aggregate — one payload for the whole landing page.
router.get('/public/home', async (_req, res) => {
  try {
    if (homeCache.payload && Date.now() - homeCache.at < HOME_CACHE_MS) {
      return ok(res, homeCache.payload);
    }

    const settingsRows = await query(`SELECT \`key\`, value FROM settings`);
    const rawSettings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
    const settings = normalizeSettings(rawSettings);

    // Settings aliases the home page reads.
    settings.name = settings.site_name || settings.organization_name;
    settings.description = settings.about || settings.organization_description;
    if (settings.logo_url) settings.logo_url = normalizeMediaUrl(settings.logo_url);

    const [
      departmentsRaw,
      featuredDoctors,
      servicesRaw,
      announcements,
      newsRaw,
      testimonials,
      galleryRaw,
      leadershipRaw,
      docCountRows,
      deptCountRows,
    ] = await Promise.all([
      query(
        `SELECT d.*, m.id AS featured_image_media_id, m.url AS image_url
         FROM departments d
         LEFT JOIN media m ON m.id = d.featured_image_id
         WHERE d.deleted_at IS NULL AND d.is_active = 1
         ORDER BY d.\`order\` ASC LIMIT 6`
      ),
      query(
        `SELECT d.*, dept.name AS department_name, m.id AS photo_media_id, m.url AS photo_url
         FROM doctors d
         LEFT JOIN departments dept ON dept.id = d.department_id
         LEFT JOIN media m ON m.id = d.photo_id
         WHERE d.deleted_at IS NULL AND d.is_available = 1 AND d.is_featured = 1
         ORDER BY d.\`order\` ASC LIMIT 4`
      ),
      query(
        `SELECT s.*, m.id AS featured_image_media_id, m.url AS image_url
         FROM services s
         LEFT JOIN media m ON m.id = s.featured_image_id
         WHERE s.deleted_at IS NULL AND s.is_available = 1
         ORDER BY s.\`order\` ASC LIMIT 6`
      ),
      query(
        `SELECT * FROM announcements
         WHERE deleted_at IS NULL AND status = 'published'
         ORDER BY is_pinned DESC, published_at DESC LIMIT 3`
      ),
      query(
        `SELECT n.*, m.id AS featured_image_media_id, m.url AS image_url
         FROM news n
         LEFT JOIN media m ON m.id = n.featured_image_id
         WHERE n.deleted_at IS NULL AND n.status = 'published'
         ORDER BY n.published_at DESC LIMIT 3`
      ),
      query(
        `SELECT * FROM testimonials
         WHERE is_approved = 1
         ORDER BY is_featured DESC, \`order\` ASC, created_at DESC LIMIT 6`
      ),
      query(
        `SELECT g.*, m.id AS media_row_id, m.url AS media_url
         FROM gallery g
         LEFT JOIN media m ON m.id = g.media_id
         WHERE COALESCE(g.type, 'image') = 'image' AND COALESCE(g.is_active, 1) = 1
         ORDER BY g.\`order\` ASC, g.created_at DESC LIMIT 8`
      ),
      query(
        `SELECT l.*, m.id AS photo_media_id, m.url AS photo_url
         FROM leadership l
         LEFT JOIN media m ON m.id = l.photo_id
         WHERE l.deleted_at IS NULL AND l.is_active = 1
         ORDER BY l.\`order\` ASC LIMIT 6`
      ),
      query(
        `SELECT COUNT(*) AS total FROM doctors WHERE deleted_at IS NULL AND is_available = 1`
      ),
      query(
        `SELECT COUNT(*) AS total FROM departments WHERE deleted_at IS NULL AND is_active = 1`
      ),
    ]);

    let departments = departmentsRaw;
    let doctors = featuredDoctors;
    if (!doctors.length) {
      doctors = await query(
        `SELECT d.*, dept.name AS department_name, m.id AS photo_media_id, m.url AS photo_url
         FROM doctors d
         LEFT JOIN departments dept ON dept.id = d.department_id
         LEFT JOIN media m ON m.id = d.photo_id
         WHERE d.deleted_at IS NULL AND d.is_available = 1
         ORDER BY d.\`order\` ASC LIMIT 4`
      );
    }

    let services = servicesRaw;
    let news = newsRaw;
    let gallery = galleryRaw;
    let leadership = leadershipRaw;

    // Normalize URLs and nest each row's media object.
    departments = departments.map((row) => {
      nestMedia(row, 'image_url', 'featured_image');
      return row;
    });
    doctors = doctors.map((row) => {
      nestMedia(row, 'photo_url', 'photo');
      if (row.department_name) {
        row.department = { id: row.department_id, name: row.department_name };
      }
      return row;
    });
    services = services.map((row) => {
      nestMedia(row, 'image_url', 'featured_image');
      return row;
    });
    news = news.map((row) => {
      nestMedia(row, 'image_url', 'featured_image');
      return row;
    });
    gallery = gallery.map((row) => {
      nestMedia(row, 'media_url', 'media');
      return row;
    });
    leadership = leadership.map((row) => {
      nestMedia(row, 'photo_url', 'photo');
      return row;
    });

    /**
     * The home page shows two lines of each card. It was being sent every
     * record's complete body to do it — 141 KB for roughly twenty-five records,
     * nearly all of it rich text no card renders. These queries are the home
     * page's own, so they do not go through the CRUD factory's list excerpting
     * and have to say it here.
     *
     * The detail pages each fetch their own record and are unaffected.
     */
    excerptRows(departments, ['description']);
    excerptRows(services, ['description']);
    excerptRows(doctors, ['bio']);
    excerptRows(leadership, ['bio']);
    excerptRows(news, ['content']);
    excerptRows(announcements, ['content']);

    // Hero slides — prefer Cloudinary (fast), cap at 5 for page weight.
    const HERO_CAP = 5;
    const pushHero = (list, url, title, alt) => {
      const normalized = normalizeMediaUrl(url);
      if (!normalized) return;
      list.push({ url: normalized, alt: alt || 'Hospital Image', title: title || '' });
    };

    const galleryHeroes = [];
    const galleryHeroesSlow = [];
    for (const g of gallery) {
      const url = g.media?.url || g.media_url;
      if (!url) continue;
      const entry = { url, title: g.title || '', alt: g.title || 'Hospital Image' };
      if (isFastCdnUrl(url) || isFastCdnUrl(normalizeMediaUrl(url))) {
        galleryHeroes.push(entry);
      } else {
        galleryHeroesSlow.push(entry);
      }
    }

    // Prefer fast CDN heroes. Only fall back to slow storage when none exist.
    const heroPool = galleryHeroes.length
      ? galleryHeroes
      : [...galleryHeroesSlow];
    const heroImages = [];
    for (const item of heroPool) {
      if (heroImages.length >= HERO_CAP) break;
      pushHero(heroImages, item.url, item.title, item.alt);
    }

    if (heroImages.length < HERO_CAP && galleryHeroes.length === 0) {
      const newsHeroes = await query(
        `SELECT n.title, m.url
         FROM news n
         INNER JOIN media m ON m.id = n.featured_image_id
         WHERE n.deleted_at IS NULL AND n.status = 'published'
         ORDER BY n.published_at DESC
         LIMIT ${HERO_CAP - heroImages.length}`
      );
      for (const item of newsHeroes) {
        if (heroImages.length >= HERO_CAP) break;
        pushHero(heroImages, item.url, item.title, item.title || 'Hospital News');
      }
    }

    const docCount = docCountRows[0];
    const deptCount = deptCountRows[0];

    const stats = {
      total_doctors: Number(docCount?.total || 0),
      total_departments: Number(deptCount?.total || 0),
      total_patients: Number(rawSettings.total_patients || 0),
      years_experience: Number(rawSettings.years_experience || 0),
    };

    let homeFeatures = [];
    try {
      homeFeatures = JSON.parse(rawSettings.home_features || '[]');
      if (!Array.isArray(homeFeatures)) homeFeatures = [];
      homeFeatures = homeFeatures.filter(
        (f) => f && (f.title || f.description || f.icon)
      );
    } catch {
      homeFeatures = [];
    }

    const payload = {
      settings,
      departments,
      doctors,
      services,
      announcements,
      news,
      testimonials,
      gallery,
      leadership,
      heroImages,
      stats,
      homeFeaturesTitle: rawSettings.home_features_title || '',
      homeFeaturesSubtitle: rawSettings.home_features_subtitle || '',
      homeFeatures,
    };
    homeCache = { at: Date.now(), payload };
    return ok(res, payload);
  } catch (err) {
    return serverError(res, err);
  }
});

export default router;
