import type {
  ApiResponse,
  HomeData,
  PaginatedResponse,
  PublicResource,
  SiteSettings,
} from "./types";

/**
 * Prefer 127.0.0.1 over "localhost" on Windows — Node can hang on ::1 when
 * the API only listens on IPv4.
 */
export const SERVER_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/v1";

function isLocalApiBase(base: string) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\b/i.test(base);
}

/**
 * Local browser → same-origin `/api/v1` rewrite (avoids CORS on :3001+).
 * Production browser → absolute configured API URL.
 * Server → always absolute backend URL.
 */
export function getApiBase() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // Local preview always uses the Next rewrite proxy so browser calls stay
    // same-origin.
    if (host === "localhost" || host === "127.0.0.1") {
      return "/api/v1";
    }
    if (isLocalApiBase(SERVER_API_BASE)) {
      return "/api/v1";
    }
  }
  return SERVER_API_BASE;
}

/** Absolute backend base (server / tooling). Prefer getApiBase() in app code. */
export const API_BASE = SERVER_API_BASE;

export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME || "Melka Oda General Hospital";

/** Empty by default — public copy should come from Admin → Settings. */
export const DEFAULT_TAGLINE = "";

type FetchOptions = RequestInit & { params?: Record<string, string | number> };

function buildUrl(path: string, params?: Record<string, string | number>) {
  const base = getApiBase().replace(/\/$/, "");
  const href = base.startsWith("http")
    ? `${base}${path}`
    : typeof window !== "undefined"
      ? `${window.location.origin}${base}${path}`
      : `${SERVER_API_BASE.replace(/\/$/, "")}${path}`;

  const url = new URL(href);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, headers, cache, next, ...rest } = options;
  const url = buildUrl(path, params);
  const attempts = isLocalApiBase(SERVER_API_BASE) ? 1 : 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...rest,
        headers: {
          Accept: "application/json",
          ...headers,
        },
        cache: cache ?? "no-store",
        ...(next ? { next } : {}),
      });

      const text = await response.text();
      let json: (ApiResponse<T> & { message?: string }) | null = null;
      try {
        json = text ? (JSON.parse(text) as ApiResponse<T> & { message?: string }) : null;
      } catch {
        // HTML 502/spin-up pages from Render — retry a couple times.
        if (attempt < attempts && (response.status >= 500 || response.status === 0)) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        throw new Error(
          `Invalid API response (${response.status}) from ${path}. Is the backend running at ${SERVER_API_BASE}?`
        );
      }

      if (!response.ok || !json?.success) {
        if (attempt < attempts && response.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        throw new Error(json?.message || `Request failed (${response.status})`);
      }

      return json.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error(`Request failed for ${path}`);
}

export async function fetchHome() {
  return request<HomeData>("/public/home");
}

export async function fetchSettings() {
  return request<SiteSettings>("/public/settings");
}

export async function fetchResourceList<T>(
  resource: PublicResource,
  params?: Record<string, string | number>
) {
  return request<PaginatedResponse<T>>(`/public/${resource}`, { params });
}

export async function fetchResourceItem<T>(resource: PublicResource, idOrSlug: string) {
  return request<T>(`/public/${resource}/${idOrSlug}`);
}

export async function submitContact(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  department?: string;
}) {
  const response = await fetch(buildUrl("/public/contact"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to send message");
  }
  return json.data;
}

export async function applyCareer(slug: string, formData: FormData) {
  const response = await fetch(buildUrl(`/public/careers/${slug}/apply`), {
    method: "POST",
    body: formData,
  });
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Application failed");
  }
  return json;
}

export async function registerEvent(
  slug: string,
  data: {
    name: string;
    email: string;
    phone: string;
    organization?: string;
    notes?: string;
  }
) {
  const response = await fetch(buildUrl(`/public/events/${slug}/register`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Registration failed");
  }
  return json;
}

/**
 * Bump a download's public counter. Fire-and-forget: the visitor's file must
 * open whether or not the ping lands, so callers ignore the result.
 */
export async function trackDownload(idOrSlug: string | number) {
  try {
    await fetch(buildUrl(`/public/downloads/${idOrSlug}/track`), { method: "POST" });
  } catch {
    /* counter is best-effort */
  }
}
