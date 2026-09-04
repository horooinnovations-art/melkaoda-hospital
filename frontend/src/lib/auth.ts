export const TOKEN_KEY = "melkaoda_admin_token";
export const USER_KEY = "melkaoda_admin_user";

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
  /**
   * Read-only privilege marker from `users.is_root_admin`. The API has always
   * returned it; nothing on this side read it, and the panel guessed instead by
   * looking for the word "admin" in the user's own name (MEL2-SEC-008).
   */
  is_root_admin?: boolean;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
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
