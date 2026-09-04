"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginMutation } from "@/store/adminApi";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import { setToken, setStoredUser, clearToken } from "@/lib/auth";
import { hasPanelAccess } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading }] = useLoginMutation();
  const { data: settings } = useGetSettingsQuery();

  const siteName =
    (settings?.site_name as string) ||
    (settings?.organization_name as string) ||
    (settings?.name as string) ||
    SITE_NAME;
  const logoUrl = resolveMediaUrl(
    (settings?.logo_url as string) ||
      (settings?.organization_logo as string) ||
      undefined
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await login({
        email: email.trim().replace(/[\u200B-\u200D\uFEFF]/g, ""),
        password,
      }).unwrap();
      if (!hasPanelAccess(result.user)) {
        clearToken();
        toast.error("Your account does not have admin panel access");
        return;
      }
      setToken(result.token);
      setStoredUser(result.user);
      toast.success(`Welcome back, ${result.user.name}`);
      router.replace("/admin");
    } catch (err) {
      const apiErr = err as {
        data?: { message?: string };
        error?: string;
        status?: string | number;
      };
      let msg =
        apiErr?.data?.message ||
        (typeof apiErr?.error === "string" ? apiErr.error : null) ||
        (err instanceof Error ? err.message : null) ||
        "Invalid credentials";
      if (apiErr?.status === 429) {
        msg =
          apiErr?.data?.message ||
          "Too many login attempts. Wait about a minute and try again.";
      }
      toast.error(msg);
    }
  }

  return (
    <div className="admin-login relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="admin-login__bg" aria-hidden />
      <div className="admin-login__frame grid gap-0 lg:grid-cols-2">
        <section className="admin-login__side">
          <div className="relative z-[1] mb-8 inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#f7ebdf]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--ld-accent)]" />
            Ledger access
          </div>
          <h1 className="relative z-[1] font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Hospital records, refined
          </h1>
          <p className="relative z-[1] mt-4 max-w-sm text-sm leading-relaxed text-white/75">
            Sign in to manage pages, clinical data, media, and staff accounts
            from a quieter command surface.
          </p>
          <ul className="relative z-[1] mt-10 space-y-2 text-sm text-white/80">
            <li className="border-t border-white/15 pt-2">Top menus for every section</li>
            <li className="border-t border-white/15 pt-2">Dense table layouts for records</li>
            <li className="border-t border-white/15 pt-2">Polished atelier chrome — not a card wall</li>
          </ul>
        </section>

        <section className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--ld-line-strong)] bg-white shadow-[0_10px_24px_-18px_rgba(11,28,44,0.45)]">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={siteName}
                  width={48}
                  height={48}
                  className="h-full w-full object-contain p-1"
                  unoptimized
                />
              ) : (
                <span className="text-xs font-bold">GH</span>
              )}
            </div>
            <div>
              <p className="ld-kicker">Admin sign-in</p>
              <h2 className="font-display text-xl font-semibold text-[var(--ld-ink)]">
                {siteName}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ld-faint)]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ld-faint)]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ld-faint)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="h-11 w-full bg-[var(--ld-ink)] text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            {/* Until now a locked-out administrator had no self-service route
                back in at all (MEL2-SEC-006). */}
            <Link
              href="/admin/forgot-password"
              className="block text-center text-sm text-[#525252] underline underline-offset-4 hover:text-[#111]"
            >
              Forgot your password?
            </Link>
          </form>
        </section>
      </div>
    </div>
  );
}
