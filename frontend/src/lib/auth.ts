export const TOKEN_KEY = "melkaoda_admin_token";
export const USER_KEY = "melkaoda_admin_user";
/**
 * Keys this project inherited from its Gambo and Loke ancestors. Read on load so
 * an already-signed-in admin is not logged out by the rename, and cleared on
 * sign-out (MEL-CFG-002).
 */
const LEGACY_TOKEN_KEYS = ["gambo_admin_token", "loke_admin_token"];
const LEGACY_USER_KEYS = ["gambo_admin_user", "loke_admin_user"];

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  status?: string;
  roles?: string[];
  role_names?: string[];
  permissions?: string[];
  created_at?: string | null;
  last_login_at?: string | null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const current = localStorage.getItem(TOKEN_KEY);
  if (current) return current;
  for (const key of LEGACY_TOKEN_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      // Migrate forward once, then stop reading the old key.
      localStorage.setItem(TOKEN_KEY, legacy);
      localStorage.removeItem(key);
      return legacy;
    }
  }
  return null;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  for (const key of [...LEGACY_TOKEN_KEYS, ...LEGACY_USER_KEYS]) {
    localStorage.removeItem(key);
  }
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(USER_KEY) ||
    LEGACY_USER_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ||
    null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AdminUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
