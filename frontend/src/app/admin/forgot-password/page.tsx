"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestPasswordResetMutation } from "@/store/adminApi";

/**
 * Request a password-reset link.
 *
 * There was previously no reset path anywhere in the product, so a locked-out
 * administrator needed another administrator or a redeploy with the
 * break-glass environment flag (MEL2-SEC-006).
 *
 * The confirmation below is deliberately the same whether or not the address
 * belongs to an account — a different message would let anyone test which
 * addresses are registered.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [requestReset, { isLoading }] = useRequestPasswordResetMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await requestReset({ email: email.trim() }).unwrap();
    } catch {
      // Even a failure shows the neutral confirmation: a visible error here
      // would distinguish a known address from an unknown one.
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-4">
      <div className="w-full max-w-md border-2 border-[#111] bg-white p-8">
        <p className="ld-kicker">Melka Oda General Hospital</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#111]">
          Reset your password
        </h1>

        {sent ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 border-2 border-[#111] bg-[#f5f5f5] p-4">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#111]" />
              <p className="text-sm text-[#333]">
                If that address belongs to an account, a reset link is on its way. The link
                can be used once and expires in 30 minutes.
              </p>
            </div>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#111] underline underline-offset-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <p className="text-sm text-[#525252]">
              Enter the email address on your account and we will send you a link to choose
              a new password.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.example"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 text-sm text-[#525252] underline underline-offset-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
