"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  Shield,
  User,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetMeQuery,
  useUpdateMeMutation,
  useUpdateMyPasswordMutation,
} from "@/store/adminApi";
import { setStoredUser, setToken } from "@/lib/auth";
import { resolveMediaUrl, shouldBypassImageOptimizer } from "@/lib/media";
import { StatusBadge } from "@/components/admin/adminDisplay";

function apiError(err: unknown, fallback: string) {
  const e = err as { data?: { message?: string }; error?: string };
  return e?.data?.message || (typeof e?.error === "string" ? e.error : null) || fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelative(value?: string | null) {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export default function AdminProfilePage() {
  const { data: me, isLoading } = useGetMeQuery();
  const [updateMe, { isLoading: savingProfile }] = useUpdateMeMutation();
  const [updatePassword, { isLoading: savingPassword }] = useUpdateMyPasswordMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    if (!me) return;
    setName(me.name || "");
    setEmail(me.email || "");
    setPhone(me.phone || "");
  }, [me]);

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatar);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  const roleLabel = useMemo(() => {
    if (me?.role_names?.length) return me.role_names[0];
    if (me?.roles?.length) {
      return me.roles[0]
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return "User";
  }, [me]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("email", email.trim());
    fd.append("phone", phone.trim());
    if (avatar) fd.append("avatar", avatar);

    try {
      const updated = await updateMe(fd).unwrap();
      setStoredUser(updated);
      setAvatar(null);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(apiError(err, "Could not update profile"));
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (password !== passwordConfirm) {
      toast.error("Password confirmation does not match");
      return;
    }

    try {
      const result = await updatePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirm,
      }).unwrap();
      // The change invalidated every token issued before it, this tab's
      // included. Swap in the replacement the API returned.
      if (result?.token) setToken(result.token);
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirm("");
      toast.success("Password updated. Other devices have been signed out.");
    } catch (err) {
      toast.error(apiError(err, "Could not update password"));
    }
  }

  if (isLoading || !me) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--hb-accent)]" />
      </div>
    );
  }

  const headerAvatar =
    avatarPreview || resolveMediaUrl(me.avatar || undefined) || null;
  const formAvatar = headerAvatar;

  return (
    <div className="space-y-6">
      <div>
        <p className="hb-kicker">
          Account
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-tight text-slate-900 sm:text-3xl">
          My Profile
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Update your account details, avatar, and password.
        </p>
      </div>

      {/* Profile header */}
      <section className="hb-welcome !rounded-md p-6 sm:p-8">
        <div className="hb-welcome__grid" aria-hidden />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div className="relative h-[7.5rem] w-[7.5rem] shrink-0 overflow-hidden rounded-md bg-slate-100 ring-4 ring-slate-200 shadow-sm">
            {headerAvatar ? (
              <Image
                src={headerAvatar}
                alt={me.name}
                fill
                className="object-cover"
                sizes="120px"
                unoptimized={shouldBypassImageOptimizer(headerAvatar)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <User className="h-12 w-12 text-slate-500" />
              </span>
            )}
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {me.name}
            </h3>
            <p className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 sm:justify-start">
              <Mail className="h-4 w-4 text-slate-500" />
              {me.email}
            </p>
            {me.phone ? (
              <p className="mt-1 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 sm:justify-start">
                <Phone className="h-4 w-4 text-slate-500" />
                {me.phone}
              </p>
            ) : null}
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1 text-xs font-semibold text-white shadow-sm">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              {roleLabel}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Profile information */}
        <form
          onSubmit={handleProfileSubmit}
          className="hb-panel overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--hb-accent-soft)] text-[var(--hb-accent)]">
              <UserCog className="h-4 w-4" />
            </div>
            <h3 className="font-display text-xl text-slate-900">Profile Information</h3>
          </div>

          <div className="space-y-5 p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--hb-accent-soft)] ring-2 ring-slate-200">
                {formAvatar ? (
                  <Image
                    src={formAvatar}
                    alt="Avatar preview"
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized={shouldBypassImageOptimizer(formAvatar)}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-slate-900">
                    <User className="h-8 w-8" />
                  </span>
                )}
              </div>
              <div className="text-center sm:text-left">
                <Label
                  htmlFor="profile-avatar"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-[var(--hb-accent-soft)]"
                >
                  <Camera className="h-4 w-4" />
                  Change Avatar
                </Label>
                <Input
                  id="profile-avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                />
                <p className="mt-2 text-xs text-ink-muted">JPG, PNG, GIF or WebP. Max 2MB</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email Address</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone Number</Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="rounded-md"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4">
            <Button asChild type="button" variant="outline" className="rounded-md">
              <Link href="/admin">
                <X className="h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <Button type="submit" disabled={savingProfile} className="rounded-md">
              {savingProfile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </form>

        {/* Change password */}
        <form
          onSubmit={handlePasswordSubmit}
          className="hb-panel overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--hb-accent-soft)] text-[var(--hb-accent)]">
              <Lock className="h-4 w-4" />
            </div>
            <h3 className="font-display text-xl text-slate-900">Change Password</h3>
          </div>

          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="rounded-md"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-md"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
                className="rounded-md"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 px-6 py-4">
            <Button type="submit" disabled={savingPassword} className="rounded-md">
              {savingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Account information */}
      <section className="hb-panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--hb-accent-soft)] text-[var(--hb-accent)]">
            <Info className="h-4 w-4" />
          </div>
          <h3 className="font-display text-xl text-slate-900">Account Information</h3>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border-l-4 border-[var(--hb-accent)] bg-stone/30 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Account Status
            </p>
            <div className="mt-2 flex items-center gap-2">
              {(me.status || "active") === "active" ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Active
                </span>
              ) : (
                <StatusBadge value={me.status || "inactive"} />
              )}
            </div>
          </div>
          <div className="rounded-md border-l-4 border-[var(--hb-accent)] bg-stone/30 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Member Since
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatDate(me.created_at)}
            </p>
          </div>
          <div className="rounded-md border-l-4 border-[var(--hb-accent)] bg-stone/30 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Last Login
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatRelative(me.last_login_at)}
            </p>
          </div>
          <div className="rounded-md border-l-4 border-[var(--hb-accent)] bg-stone/30 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              User ID
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">#{me.id}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
