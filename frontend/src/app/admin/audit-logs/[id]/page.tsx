"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetAuditLogQuery } from "@/store/adminApi";
import { formatDate, cn } from "@/lib/utils";

function modelLabel(type?: string | null) {
  if (!type) return "—";
  const base = type.includes("\\") ? type.split("\\").pop()! : type;
  return base.replace(/_/g, " ");
}

function actionTone(action: string) {
  const a = action.toLowerCase();
  if (a === "create" || a === "login") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200/80";
  }
  if (a === "update" || a === "logout") {
    return "bg-sky-50 text-sky-700 ring-sky-200/80";
  }
  if (a === "delete" || a.includes("fail")) {
    return "bg-rose-50 text-rose-700 ring-rose-200/80";
  }
  return "bg-stone/60 text-ink ring-slate-200";
}

function JsonBlock({ value }: { value: unknown }) {
  if (value == null || value === "") {
    return <p className="text-sm text-ink-muted">None</p>;
  }
  const text =
    typeof value === "string"
      ? value
      : JSON.stringify(value, null, 2);
  return (
    <pre className="overflow-x-auto rounded-md border border-slate-200 bg-stone/40 p-4 text-xs leading-relaxed text-ink">
      {text}
    </pre>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default function AdminAuditLogDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { data: log, isLoading, isError } = useGetAuditLogQuery(id, {
    skip: !Number.isFinite(id) || id <= 0,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--hb-accent)]" />
      </div>
    );
  }

  if (isError || !log) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-ink-muted">Audit log not found</p>
        <Button asChild variant="outline">
          <Link href="/admin/audit-logs">
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>
    );
  }

  const userName = log.user?.name || log.user_name || (log.user_id ? `User #${log.user_id}` : "System");
  const userEmail = log.user?.email || log.user_email;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="hb-kicker">
            Security
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-tight text-slate-900 sm:text-3xl">
            Audit Log Details
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Inspect system activity and change history
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/audit-logs">
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white/85 p-6 shadow-[0_20px_50px_-35px_rgba(79,70,229,0.28)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--hb-accent-soft)] text-[var(--hb-accent)]">
              <ScrollText className="h-4 w-4" />
            </div>
            <h3 className="font-display text-lg text-slate-900">Basic Information</h3>
          </div>
          <div className="grid gap-4">
            <Field label="Action">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1",
                  actionTone(log.action)
                )}
              >
                {log.action.replace(/_/g, " ")}
              </span>
            </Field>
            <Field label="Model Type">
              <p className="font-medium capitalize text-ink">{modelLabel(log.model_type)}</p>
            </Field>
            <Field label="Model ID">
              <p className="font-medium text-ink">{log.model_id ?? "N/A"}</p>
            </Field>
            <Field label="User">
              <p className="font-medium text-ink">{userName}</p>
              <p className="text-xs text-ink-muted">{userEmail || "N/A"}</p>
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white/85 p-6 shadow-[0_20px_50px_-35px_rgba(79,70,229,0.28)]">
          <h3 className="mb-5 font-display text-lg text-slate-900">Timestamp & Location</h3>
          <div className="grid gap-4">
            <Field label="Created At">
              <p className="font-medium text-ink">
                {formatDate(log.created_at, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </Field>
            {log.ip_address && (
              <Field label="IP Address">
                <p className="font-mono text-sm text-ink">{log.ip_address}</p>
              </Field>
            )}
            {log.url && (
              <Field label="URL">
                <p className="break-all text-sm text-ink">{log.url}</p>
              </Field>
            )}
            {log.method && (
              <Field label="HTTP Method">
                <span className="inline-flex rounded-full bg-[var(--hb-accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-900 ring-1 ring-slate-200">
                  {log.method}
                </span>
              </Field>
            )}
          </div>
        </section>
      </div>

      {Boolean(log.old_values || log.new_values) && (
        <section className="rounded-md border border-slate-200 bg-white/85 p-6 shadow-[0_20px_50px_-35px_rgba(79,70,229,0.28)]">
          <h3 className="mb-5 font-display text-lg text-slate-900">Changes</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            {log.old_values != null && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Old Values
                </p>
                <JsonBlock value={log.old_values} />
              </div>
            )}
            {log.new_values != null && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  New Values
                </p>
                <JsonBlock value={log.new_values} />
              </div>
            )}
          </div>
        </section>
      )}

      {log.changes != null ? (
        <section className="rounded-md border border-slate-200 bg-white/85 p-6 shadow-[0_20px_50px_-35px_rgba(79,70,229,0.28)]">
          <h3 className="mb-4 font-display text-lg text-slate-900">Changed Fields</h3>
          <JsonBlock value={log.changes} />
        </section>
      ) : null}

      {log.request_data != null ? (
        <section className="rounded-md border border-slate-200 bg-white/85 p-6 shadow-[0_20px_50px_-35px_rgba(79,70,229,0.28)]">
          <h3 className="mb-4 font-display text-lg text-slate-900">Request Data</h3>
          <JsonBlock value={log.request_data} />
        </section>
      ) : null}

      {log.user_agent && (
        <section className="rounded-md border border-slate-200 bg-white/85 p-6 shadow-[0_20px_50px_-35px_rgba(79,70,229,0.28)]">
          <h3 className="mb-3 font-display text-lg text-slate-900">User Agent</h3>
          <p className="break-all text-sm text-ink">{log.user_agent}</p>
        </section>
      )}
    </div>
  );
}
