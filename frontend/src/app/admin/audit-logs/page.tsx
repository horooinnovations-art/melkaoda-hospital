"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Loader2, ScrollText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAuditLogsQuery, type AuditLog } from "@/store/adminApi";
import { formatDate, cn } from "@/lib/utils";
import AdminPagination from "@/components/admin/AdminPagination";

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

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1",
        actionTone(action)
      )}
    >
      {action.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [modelType, setModelType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, isFetching } = useGetAuditLogsQuery({
    page,
    perPage,
    search: search || undefined,
    user_id: userId !== "all" ? userId : undefined,
    action: action !== "all" ? action : undefined,
    model_type: modelType !== "all" ? modelType : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const filterOpts = data?.filters;

  const actions = useMemo(() => filterOpts?.actions ?? [], [filterOpts?.actions]);
  const models = useMemo(() => filterOpts?.model_types ?? [], [filterOpts?.model_types]);
  const users = useMemo(() => filterOpts?.users ?? [], [filterOpts?.users]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setUserId("all");
    setAction("all");
    setModelType("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function userLabel(log: AuditLog) {
    return log.user?.name || log.user_name || (log.user_id ? `User #${log.user_id}` : "System");
  }

  function userEmail(log: AuditLog) {
    return log.user?.email || log.user_email || null;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="hb-kicker">
          Security
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-tight text-slate-900 sm:text-3xl">
          Audit Logs
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Track administrative actions and changes across the system
        </p>
      </div>

      <section className="rounded-md border border-slate-200 bg-white/85 p-5 shadow-[0_20px_50px_-35px_rgba(79,70,229,0.28)] backdrop-blur-sm sm:p-6">
        <form
          onSubmit={applySearch}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          <div className="sm:col-span-2 xl:col-span-2">
            <Label className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              Search
            </Label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Action, model, user, IP…"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              Action
            </Label>
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              Model
            </Label>
            <Select
              value={modelType}
              onValueChange={(v) => {
                setModelType(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All models" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {modelLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              User
            </Label>
            <Select
              value={userId}
              onValueChange={(v) => {
                setUserId(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name || u.email || `#${u.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              From
            </Label>
            <Input
              type="date"
              className="mt-1.5"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              To
            </Label>
            <Input
              type="date"
              className="mt-1.5"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-6">
            <Button type="submit" size="sm">
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </section>

      <section className="hb-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--hb-accent-soft)] text-[var(--hb-accent)]">
              <ScrollText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-lg text-slate-900">Activity</h3>
              <p className="text-sm text-ink-muted">{meta?.total ?? 0} recorded actions</p>
            </div>
          </div>
          {isFetching && !isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--hb-accent)]" />
          )}
        </div>

        <div className={isFetching && !isLoading ? "opacity-70" : undefined}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--hb-accent)]" />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-ink-muted">No audit logs found</p>
          ) : (
            <div className="admin-scroll-x">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    <th className="px-6 py-3">Action</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-6 py-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {rows.map((log, index) => (
                      <motion.tr
                        key={log.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.24 }}
                        className="border-b border-slate-100 transition hover:bg-[var(--hb-accent-soft)]/20"
                      >
                        <td className="px-6 py-4">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium capitalize text-slate-900">
                            {modelLabel(log.model_type)}
                          </p>
                          {log.model_id != null && (
                            <p className="text-xs text-ink-muted">ID: {log.model_id}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-ink">{userLabel(log)}</p>
                          {userEmail(log) && (
                            <p className="text-xs text-ink-muted">{userEmail(log)}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-ink">
                            {formatDate(log.created_at, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {formatDate(log.created_at, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/audit-logs/${log.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              <span className="sr-only">View</span>
                            </Link>
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {meta && (
          <AdminPagination
            page={meta.page}
            perPage={meta.perPage}
            total={meta.total}
            isFetching={isFetching}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
          />
        )}
      </section>
    </div>
  );
}
