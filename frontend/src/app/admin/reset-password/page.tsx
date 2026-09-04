"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompletePasswordResetMutation } from "@/store/adminApi";

/** Matches the server's minimum, so the rule is stated before it is enforced. */
const MIN_LENGTH = 12;

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [completeReset, { isLoading }] = useCompletePasswordResetMutation();

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || mismatch || !password) return;
    try {
      await completeReset({
        token,
        password,
        password_confirmation: confirm,
      }).unwrap();
      toast.success("Password changed. Sign in with your new password.");
      router.replace("/admin/login");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "This reset link has expired or has been used"
      );
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md border-2 border-[#111] bg-white p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#111]">
          This link is not valid
        </h1>
        <p className="mt-2 text-sm text-[#525252]">
          The address is missing its reset token. Request a new link and use the most recent
          email.
        </p>
        <Link
          href="/admin/forgot-password"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#111] underline underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 border-2 border-[#111] bg-white p-8"
    >
      <div>
        <p className="ld-kicker">Melka Oda General Hospital</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#111]">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-[#525252]">
          At least {MIN_LENGTH} characters. Signing in elsewhere will end those sessions.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {tooShort && (
          <p className="text-xs text-[#9E2B20]">
            Use at least {MIN_LENGTH} characters.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch && <p className="text-xs text-[#9E2B20]">The two passwords do not match.</p>}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || tooShort || mismatch || !password}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Change password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#111]" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
