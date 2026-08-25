"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Inbox } from "lucide-react";
import { useGetDashboardQuery } from "@/store/adminApi";
import { cn, formatDate } from "@/lib/utils";

export default function AdminNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useGetDashboardQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const unread = Number(data?.counts?.new_contacts ?? 0);
  const recent = (data?.recentContacts ?? []).slice(0, 5);
  const unreadRecent = recent.filter((c) => c.status === "new");
  const items = unreadRecent.length ? unreadRecent : recent;

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    function place() {
      const rect = buttonRef.current!.getBoundingClientRect();
      const width = Math.min(352, window.innerWidth - 16);
      let left = rect.right - width;
      if (left < 8) left = 8;
      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left,
        width,
        zIndex: 80,
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const panel =
    open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="admin-portal overflow-hidden border-2 border-[#111] bg-white shadow-[6px_6px_0_rgba(17,17,17,0.15)]"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b-2 border-[#111] bg-[#fafafa] px-4 py-3">
              <div>
                <p className="text-sm font-bold text-[#111]">Inbox alerts</p>
                <p className="text-xs text-[#737373]">
                  {unread > 0
                    ? `${unread} unread contact message${unread === 1 ? "" : "s"}`
                    : "No unread messages"}
                </p>
              </div>
              <Inbox className="h-4 w-4 text-[#111]" />
            </div>

            <ul className="max-h-80 divide-y divide-[#e5e5e5] overflow-y-auto">
              {isFetching && items.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-[#737373]">Loading…</li>
              ) : items.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-[#737373]">Inbox is empty</li>
              ) : (
                items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-[#f5f5f5]"
                      onClick={() => {
                        setOpen(false);
                        router.push("/admin/contact-submissions");
                      }}
                    >
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0",
                          item.status === "new" ? "bg-[#111]" : "bg-[#d4d4d4]"
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-[#111]">
                            {item.name}
                          </span>
                          {item.status === "new" && (
                            <span className="shrink-0 border border-[#111] bg-[#111] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              New
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[#525252]">
                          {item.subject}
                        </span>
                        <span className="mt-1 block text-[11px] text-[#737373]">
                          {formatDate(item.created_at, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="border-t-2 border-[#111] p-2">
              <Link
                href="/admin/contact-submissions"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center px-3 py-2.5 text-sm font-bold text-[#111] underline underline-offset-2"
              >
                Open contact inbox
              </Link>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={unread ? `${unread} unread messages` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "ld-topnav__iconbtn relative",
          open && "bg-white/15"
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-white px-1 font-mono text-[10px] font-bold leading-none text-[#111]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
