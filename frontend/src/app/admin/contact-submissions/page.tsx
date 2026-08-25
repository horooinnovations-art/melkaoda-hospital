"use client";

import { useState } from "react";
import { Loader2, Mail, Reply } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetContactsQuery,
  useGetContactQuery,
  useReplyContactMutation,
  type ContactSubmission,
} from "@/store/adminApi";
import { formatDate } from "@/lib/utils";
import AdminPagination from "@/components/admin/AdminPagination";
import { StatusBadge } from "@/components/admin/adminDisplay";

export default function ContactSubmissionsPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState("");

  const { data, isLoading, isFetching } = useGetContactsQuery({ page, perPage });
  const { data: selected } = useGetContactQuery(selectedId!, { skip: !selectedId });
  const [replyContact, { isLoading: replying }] = useReplyContactMutation();

  async function handleReply() {
    if (!selectedId || !reply.trim()) return;
    try {
      await replyContact({ id: selectedId, reply_message: reply }).unwrap();
      toast.success("Reply saved");
      setReply("");
      setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reply failed");
    }
  }

  function openContact(row: ContactSubmission) {
    setSelectedId(row.id);
    setReply(row.reply_message || "");
  }

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="ld-page space-y-5">
      <div>
        <p className="ld-kicker">Communications</p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#111] sm:text-3xl">
          Contact inbox
        </h2>
        <p className="mt-1 text-sm text-[#525252]">
          View and respond to contact form submissions.
        </p>
      </div>

      <section className="ld-panel">
        <div className="ld-panel__head">
          <div>
            <h3 className="font-display text-base font-bold text-[#111]">Submissions</h3>
            <p className="text-xs text-[#737373]">
              {meta?.total ?? 0} total
              {rows.some((r) => r.status === "new")
                ? ` · ${rows.filter((r) => r.status === "new").length} unread on this page`
                : ""}
            </p>
          </div>
          {isFetching && !isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-[#111]" />
          )}
        </div>

        <div className={isFetching && !isLoading ? "opacity-70" : undefined}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#111]" />
            </div>
          ) : rows.length === 0 ? (
            <p className="ld-empty m-3 text-sm">No messages yet</p>
          ) : (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Received</th>
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
                        <span className="font-medium text-[#111]">{row.subject}</span>
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
                            onClick={() => openContact(row)}
                            title="View"
                          >
                            <Mail className="h-4 w-4" />
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
                {selected?.subject}
              </DialogTitle>
              <DialogDescription>Review the message and save a reply.</DialogDescription>
            </DialogHeader>
          </div>
          {selected && (
            <div className="space-y-4 px-6 py-5">
              <div className="border-2 border-[#111] bg-[#f5f5f5] p-4 text-sm">
                <p className="font-bold text-[#111]">{selected.name}</p>
                <p className="text-[#525252]">{selected.email}</p>
                {selected.phone && <p className="text-[#525252]">{selected.phone}</p>}
                {selected.department && (
                  <p className="mt-1 text-xs text-[#737373]">Dept: {selected.department}</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#737373]">
                  Message
                </p>
                <p className="whitespace-pre-wrap text-sm text-[#111]">{selected.message}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reply">Reply</Label>
                <Textarea
                  id="reply"
                  rows={4}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write your reply…"
                />
              </div>
              <Button
                onClick={handleReply}
                disabled={replying || !reply.trim()}
                className="border-2 border-[#111] bg-[#111] text-white"
              >
                {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Reply className="h-4 w-4" />}
                Save reply
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
