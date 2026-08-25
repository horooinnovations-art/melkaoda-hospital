export const TOKEN_KEY = "gambo_admin_token";
export const USER_KEY = "gambo_admin_user";
const LEGACY_TOKEN_KEY = "loke_admin_token";
const LEGACY_USER_KEY = "loke_admin_user";

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
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
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
