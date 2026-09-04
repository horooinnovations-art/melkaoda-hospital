"use client";

import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
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
  useGetJobApplicationsQuery,
  useGetJobApplicationQuery,
  useGetResumeLinkMutation,
  useUpdateJobApplicationMutation,
  type JobApplication,
} from "@/store/adminApi";
import { formatDate } from "@/lib/utils";
import AdminPagination from "@/components/admin/AdminPagination";
import { StatusBadge } from "@/components/admin/adminDisplay";

/**
 * Job applications.
 *
 * The public careers page has been collecting applications — names, phone
 * numbers, email addresses and CVs — into a table that nothing in the product
 * could read (MEL2-BIZ-001). This is the read side.
 *
 * The résumé is never linked directly. It is stored privately and reached
 * through a signed five-minute URL requested per download, and each request is
 * written to the audit log with the name of the person who made it.
 */

const STATUSES = ["submitted", "under_review", "shortlisted", "rejected", "hired"] as const;

export default function JobApplicationsPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("submitted");

  const { data, isLoading, isFetching } = useGetJobApplicationsQuery({
    page,
    perPage,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: selected } = useGetJobApplicationQuery(selectedId!, { skip: !selectedId });
  const [getResumeLink, { isLoading: linking }] = useGetResumeLinkMutation();
  const [updateApplication, { isLoading: saving }] = useUpdateJobApplicationMutation();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const counts = data?.filters?.counts ?? {};

  function open(row: JobApplication) {
    setSelectedId(row.id);
    setNotes(row.notes || "");
    setStatus(row.status || "submitted");
  }

  async function handleDownload(id: number) {
    try {
      const { url, revoke } = await getResumeLink(id).unwrap();
      window.open(url, "_blank", "noopener,noreferrer");
      // An object URL from the local-storage driver holds the whole file in
      // memory until it is released; a Cloudinary signed URL has nothing to
      // revoke. The delay lets the new tab claim it first.
      if (revoke) setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The résumé could not be opened");
    }
  }

  async function handleSave() {
    if (!selectedId) return;
    try {
      await updateApplication({ id: selectedId, body: { status, notes } }).unwrap();
      toast.success("Application updated");
      setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="ld-page space-y-5">
      <div>
        <p className="ld-kicker">Recruitment</p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#111] sm:text-3xl">
          Job applications
        </h2>
        <p className="mt-1 text-sm text-[#525252]">
          Applications received through the public careers pages.
        </p>
      </div>

      <section className="ld-panel">
        <div className="ld-panel__head flex-wrap gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#111]">Applicants</h3>
            <p className="text-xs text-[#737373]">
              {meta?.total ?? 0} total
              {counts.submitted ? ` · ${counts.submitted} awaiting review` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email or phone"
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
                  {s.replace(/_/g, " ")}
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
            <p className="ld-empty m-3 text-sm">No applications yet</p>
          ) : (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Applied for</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="ld-table__name">
                          {row.first_name} {row.last_name}
                        </span>
                        <span className="ld-table__sub">{row.email}</span>
                      </td>
                      <td>
                        <span className="font-medium text-[#111]">
                          {row.career_title || "—"}
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
                            title="View application"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={!row.has_resume || linking}
                            onClick={() => handleDownload(row.id)}
                            title={
                              row.has_resume
                                ? "Open résumé"
                                : "No résumé available for this application"
                            }
                          >
                            <Download className="h-4 w-4" />
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

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="admin-portal max-w-lg border-2 border-[#111] p-0">
          <div className="border-b-2 border-[#111] bg-[#fafafa] px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#111]">
                {selected ? `${selected.first_name} ${selected.last_name}` : "Application"}
              </DialogTitle>
              <DialogDescription>
                {selected?.career_title
                  ? `Applied for ${selected.career_title}`
                  : "Review and record a decision."}
              </DialogDescription>
            </DialogHeader>
          </div>

          {selected && (
            <div className="space-y-4 px-6 py-5">
              <div className="border-2 border-[#111] bg-[#f5f5f5] p-4 text-sm">
                <p className="text-[#525252]">{selected.email}</p>
                <p className="text-[#525252]">{selected.phone}</p>
                <p className="mt-1 text-xs text-[#737373]">
                  Received{" "}
                  {formatDate(selected.created_at, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {selected.cover_letter && (
                <div>
                  <Label className="text-xs uppercase tracking-[0.12em] text-[#737373]">
                    Cover letter
                  </Label>
                  <p className="mt-1 whitespace-pre-wrap border-2 border-[#e5e5e5] p-3 text-sm text-[#333]">
                    {selected.cover_letter}
                  </p>
                </div>
              )}

              {selected.resume_is_legacy && (
                <p className="border-2 border-[#e5e5e5] bg-[#fffbeb] p-3 text-xs text-[#713f12]">
                  This application predates the current file storage. Its résumé was uploaded
                  to a location the site no longer serves and cannot be retrieved.
                </p>
              )}

              <div className="grid gap-2">
                <Label htmlFor="app-status">Status</Label>
                <select
                  id="app-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 border-2 border-[#111] bg-white px-2 text-sm capitalize"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="app-notes">Internal notes</Label>
                <Textarea
                  id="app-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Notes are visible to anyone who can manage careers."
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {selected.has_resume && (
                  <Button
                    variant="outline"
                    disabled={linking}
                    onClick={() => handleDownload(selected.id)}
                  >
                    {linking ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Open résumé
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelectedId(null)}>
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
