"use client";

import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetEventRegistrationsQuery,
  useUpdateEventRegistrationMutation,
  type EventRegistration,
} from "@/store/adminApi";
import { formatDate } from "@/lib/utils";
import AdminPagination from "@/components/admin/AdminPagination";
import { StatusBadge } from "@/components/admin/adminDisplay";

/**
 * Event registrations — the read side for the public registration form, which
 * had been writing to a table nothing could read (MEL2-BIZ-001).
 */

const STATUSES = ["pending", "confirmed", "attended", "cancelled"] as const;

export default function EventRegistrationsPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<EventRegistration | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("pending");

  const { data, isLoading, isFetching } = useGetEventRegistrationsQuery({
    page,
    perPage,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const [updateRegistration, { isLoading: saving }] = useUpdateEventRegistrationMutation();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const counts = data?.filters?.counts ?? {};

  function open(row: EventRegistration) {
    setSelected(row);
    setNotes(row.notes || "");
    setStatus(row.status || "pending");
  }

  async function handleSave() {
    if (!selected) return;
    try {
      await updateRegistration({ id: selected.id, body: { status, notes } }).unwrap();
      toast.success("Registration updated");
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="ld-page space-y-5">
      <div>
        <p className="ld-kicker">Events</p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#111] sm:text-3xl">
          Event registrations
        </h2>
        <p className="mt-1 text-sm text-[#525252]">
          People who registered through the public event pages.
        </p>
      </div>

      <section className="ld-panel">
        <div className="ld-panel__head flex-wrap gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#111]">Registrations</h3>
            <p className="text-xs text-[#737373]">
              {meta?.total ?? 0} total
              {counts.pending ? ` · ${counts.pending} pending confirmation` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email or organization"
              className="h-9 w-56 border-2 border-[#111]"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 border-2 border-[#111] bg-white px-2 text-sm capitalize"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {isFetching && !isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-[#111]" />
            )}
          </div>
        </div>

        <div className={isFetching && !isLoading ? "opacity-70" : undefined}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#111]" />
            </div>
          ) : rows.length === 0 ? (
            <p className="ld-empty m-3 text-sm">No registrations yet</p>
          ) : (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>Attendee</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="ld-table__name">{row.name}</span>
                        <span className="ld-table__sub">{row.email}</span>
                      </td>
                      <td>
                        <span className="font-medium text-[#111]">
                          {row.event_title || "—"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge value={row.status} />
                      </td>
                      <td>
                        {formatDate(row.created_at, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <div className="ld-table__actions">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => open(row)}
                            title="View registration"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {meta && (
          <div className="border-t-2 border-[#111] px-4 py-3">
            <AdminPagination
              page={meta.page}
              perPage={meta.perPage}
              total={meta.total}
              isFetching={isFetching}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
            />
          </div>
        )}
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="admin-portal max-w-lg border-2 border-[#111] p-0">
          <div className="border-b-2 border-[#111] bg-[#fafafa] px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#111]">
                {selected?.name}
              </DialogTitle>
              <DialogDescription>
                {selected?.event_title
                  ? `Registered for ${selected.event_title}`
                  : "Registration details"}
              </DialogDescription>
            </DialogHeader>
          </div>

          {selected && (
            <div className="space-y-4 px-6 py-5">
              <div className="border-2 border-[#111] bg-[#f5f5f5] p-4 text-sm">
                <p className="text-[#525252]">{selected.email}</p>
                <p className="text-[#525252]">{selected.phone}</p>
                {selected.organization && (
                  <p className="mt-1 text-xs text-[#737373]">
                    Organization: {selected.organization}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reg-status">Status</Label>
                <select
                  id="reg-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 border-2 border-[#111] bg-white px-2 text-sm capitalize"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reg-notes">Notes</Label>
                <Textarea
                  id="reg-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
