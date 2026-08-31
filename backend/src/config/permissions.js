/**
 * Canonical Deder-parity permission slugs.
 * Controllers / routes check these; super_admin bypasses all checks.
 */
export const CANONICAL_PERMISSIONS = [
  { slug: 'manage_pages', name: 'Manage Pages', module: 'pages' },
  { slug: 'manage_leadership', name: 'Manage Leadership', module: 'leadership' },
  { slug: 'manage_announcements', name: 'Manage Announcements', module: 'announcements' },
  { slug: 'manage_news', name: 'Manage News', module: 'news' },
  { slug: 'manage_gallery', name: 'Manage Gallery', module: 'gallery' },
  { slug: 'manage_media', name: 'Manage Media', module: 'media' },
  { slug: 'manage_events', name: 'Manage Events', module: 'events' },
  { slug: 'manage_testimonials', name: 'Manage Testimonials', module: 'testimonials' },
  { slug: 'manage_faqs', name: 'Manage FAQs', module: 'faqs' },
  { slug: 'manage_downloads', name: 'Manage Downloads', module: 'downloads' },
  { slug: 'manage_contact_submissions', name: 'Manage Contact Submissions', module: 'contact' },
  { slug: 'manage_departments', name: 'Manage Departments', module: 'departments' },
  { slug: 'manage_doctors', name: 'Manage Doctors', module: 'doctors' },
  { slug: 'manage_services', name: 'Manage Services', module: 'services' },
  { slug: 'manage_appointments', name: 'Manage Appointments', module: 'appointments' },
  { slug: 'manage_emergency_services', name: 'Manage Emergency Services', module: 'emergency' },
  { slug: 'manage_insurance', name: 'Manage Insurance', module: 'insurance' },
  { slug: 'manage_health_education', name: 'Manage Health Education', module: 'health_education' },
  { slug: 'manage_careers', name: 'Manage Careers', module: 'careers' },
  { slug: 'manage_users', name: 'Manage Users', module: 'users' },
  { slug: 'manage_roles', name: 'Manage Roles', module: 'roles' },
  { slug: 'manage_permissions', name: 'Manage Permissions', module: 'permissions' },
  { slug: 'manage_settings', name: 'Manage Settings', module: 'settings' },
  { slug: 'view_audit_logs', name: 'View Audit Logs', module: 'audit_logs' },
];

/** Admin CRUD path → required permission slug */
export const RESOURCE_PERMISSIONS = {
  pages: 'manage_pages',
  leadership: 'manage_leadership',
  'leadership-history': 'manage_leadership',
  announcements: 'manage_announcements',
  news: 'manage_news',
  gallery: 'manage_gallery',
  events: 'manage_events',
  testimonials: 'manage_testimonials',
  faqs: 'manage_faqs',
  downloads: 'manage_downloads',
  departments: 'manage_departments',
  'department-categories': 'manage_departments',
  'partnership-categories': 'manage_pages',
  doctors: 'manage_doctors',
  specializations: 'manage_doctors',
  services: 'manage_services',
  'emergency-services': 'manage_emergency_services',
  insurance: 'manage_insurance',
  'health-education': 'manage_health_education',
  careers: 'manage_careers',
};
