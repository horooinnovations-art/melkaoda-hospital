/**
 * Permission map for admin UI routes.
 * `null` = any authenticated panel user (dashboard / profile).
 * `super_admin` = role check, not a permission slug.
 */
export const ADMIN_ROUTE_PERMISSIONS: Record<string, string | null> = {
  "/admin": null,
  "/admin/profile": null,
  "/admin/pages": "manage_pages",
  "/admin/news": "manage_news",
  "/admin/announcements": "manage_announcements",
  "/admin/gallery": "manage_gallery",
  "/admin/leadership": "manage_leadership",
  "/admin/leadership-history": "manage_leadership",
  "/admin/events": "manage_events",
  "/admin/testimonials": "manage_testimonials",
  "/admin/faqs": "manage_faqs",
  "/admin/downloads": "manage_downloads",
  "/admin/health-education": "manage_health_education",
  "/admin/departments": "manage_departments",
  "/admin/department-categories": "manage_departments",
  "/admin/doctors": "manage_doctors",
  "/admin/specializations": "manage_doctors",
  "/admin/services": "manage_services",
  "/admin/emergency-services": "manage_emergency_services",
  "/admin/insurance": "manage_insurance",
  "/admin/partnerships": "manage_pages",
  "/admin/partnership-categories": "manage_pages",
  "/admin/careers": "manage_careers",
  // Applicant and attendee records sit behind the same permission as the
  // vacancy or event they belong to.
  "/admin/job-applications": "manage_careers",
  "/admin/event-registrations": "manage_events",
  "/admin/users": "manage_users",
  "/admin/roles": "manage_roles",
  "/admin/permissions": "super_admin",
  "/admin/media": "manage_media",
  "/admin/contact-submissions": "manage_contact_submissions",
  "/admin/settings": "manage_settings",
  "/admin/audit-logs": "view_audit_logs",
};

export const PANEL_ROLES = ["admin", "super_admin", "editor", "doctor", "staff"] as const;

export type AccessUser = {
  roles?: string[];
  permissions?: string[];
} | null | undefined;

export function isSuperAdmin(user: AccessUser) {
  return (user?.roles || []).includes("super_admin");
}

/**
 * Privileged super admin: the `super_admin` role AND the server's read-only
 * `is_root_admin` marker.
 *
 * This used to test whether the user's own email or name contained the word
 * "admin" — the same self-grantable heuristic the API removed in favour of the
 * `users.is_root_admin` column, left behind on this side (MEL2-SEC-008). It
 * unlocked create-and-manage affordances the API then rejected, and it ignored
 * the authoritative flag the API already returns.
 *
 * The server enforces this independently; this only decides what is worth
 * showing.
 */
export function isPrivilegedSuperAdmin(
  user: (AccessUser & { is_root_admin?: boolean | number | string | null }) | null | undefined
) {
  const flag = user?.is_root_admin;
  const isRoot = flag === true || flag === 1 || flag === "1";
  return isSuperAdmin(user) && isRoot;
}

export function userHasSuperRole(user: {
  roles?: Array<string | { slug?: string }> | string[];
} | null | undefined) {
  return (user?.roles || []).some((r) =>
    typeof r === "string" ? r === "super_admin" : r?.slug === "super_admin"
  );
}

export function hasPanelAccess(user: AccessUser) {
  if (isSuperAdmin(user)) return true;
  const roles = user?.roles || [];
  return PANEL_ROLES.some((r) => roles.includes(r));
}

export function can(user: AccessUser, permission: string | null | undefined) {
  if (!permission) return true;
  if (isSuperAdmin(user)) return true;
  if (permission === "super_admin") return false;
  return (user?.permissions || []).includes(permission);
}

export function permissionForPath(pathname: string): string | null | undefined {
  if (pathname === "/admin" || pathname === "/admin/") return null;
  const match = Object.keys(ADMIN_ROUTE_PERMISSIONS)
    .filter((path) => path !== "/admin")
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!match) return null;
  return ADMIN_ROUTE_PERMISSIONS[match];
}

export function canAccessPath(user: AccessUser, pathname: string) {
  if (!hasPanelAccess(user)) return false;
  return can(user, permissionForPath(pathname));
}
