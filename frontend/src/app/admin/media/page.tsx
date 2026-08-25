"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FolderOpen, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetMediaQuery,
  useUploadMediaMutation,
  useDeleteMediaMutation,
} from "@/store/adminApi";
import { resolveMediaUrl } from "@/lib/media";

export default function AdminMediaPage() {
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState("general");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useGetMediaQuery({ page, perPage: 24 });
  const [upload, { isLoading: uploading }] = useUploadMediaMutation();
  const [deleteMedia, { isLoading: deleting }] = useDeleteMediaMutation();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    try {
      await upload(fd).unwrap();
      toast.success("File uploaded");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this file?")) return;
    try {
      await deleteMedia(id).unwrap();
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="hb-kicker">
          Assets
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-tight text-slate-900 sm:text-3xl">
          Media Library
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Upload and manage media files</p>
      </div>

      <section className="hb-panel overflow-hidden">
        <div className="border-b border-slate-200 bg-gradient-to-r from-[var(--hb-accent-soft)] to-white px-6 py-5">
          <h3 className="font-display text-lg text-slate-900">Upload</h3>
          <p className="text-sm text-ink-muted">
            Images and documents are stored on the server
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="folder">Folder</Label>
            <div className="relative">
              <FolderOpen className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                id="folder"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="general"
                className="w-48 rounded-md pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              ref={fileRef}
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="max-w-xs rounded-md"
            />
          </div>
          <Button
            variant="outline"
            className="rounded-md"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </Button>
        </div>
      </section>

      <section className="hb-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="font-display text-lg text-slate-900">Files</h3>
            <p className="text-sm text-ink-muted">{data?.meta.total ?? 0} files in library</p>
          </div>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--hb-accent)]" />
            </div>
          ) : (data?.data ?? []).length === 0 ? (
            <div className="rounded-md bg-[var(--hb-accent-soft)]/80 px-4 py-16 text-center">
              <p className="font-display text-lg text-slate-900">No media yet</p>
              <p className="mt-1 text-sm text-ink-muted">Upload your first file above.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(data?.data ?? []).map((item) => {
                const url = resolveMediaUrl(item.url);
                const isImage = item.mime_type?.startsWith("image/");
                return (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[rgba(21,128,61,0.35)] hover:shadow-none"
                  >
                    <div className="relative aspect-square bg-gradient-to-br from-[var(--hb-accent-soft)] to-slate-100">
                      {isImage && url ? (
                        <Image
                          src={url}
                          alt={item.filename}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-xs text-ink-muted">
                          {item.mime_type || "File"}
                        </div>
                      )}
                    </div>
                    <div className="p-3.5">
                      <p className="truncate text-xs font-medium text-ink">{item.filename}</p>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        {item.folder}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting}
                      className="absolute right-2.5 top-2.5 rounded-md bg-white/95 p-2 text-red-600 opacity-0 shadow-sm ring-1 ring-black/5 transition group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {data?.meta && data.meta.total > data.meta.perPage && (
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                disabled={page * data.meta.perPage >= data.meta.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
