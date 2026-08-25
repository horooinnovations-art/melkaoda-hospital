"use client";

import { useEffect, useState } from "react";
import { getStoredUser, isAuthenticated, type AdminUser } from "@/lib/auth";

/**
 * Returns `null` until after mount, then the real auth state.
 * Avoids hydration mismatch from reading localStorage during SSR.
 */
export function useIsAuthenticated() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  return authed;
}

/**
 * Returns `null` until after mount, then the stored admin user (if any).
 */
export function useStoredUser() {
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return user;
}
