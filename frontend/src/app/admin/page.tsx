"use client";

import Link from "next/link";
import {
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGetDashboardQuery } from "@/store/adminApi";
import { formatDate } from "@/lib/utils";
import { useStoredUser } from "@/hooks/useClientAuth";

const KPI = [
  { key: "departments", label: "Departments", href: "/admin/departments" },
  { key: "doctors", label: "Doctors", href: "/admin/doctors" },
  { key: "services", label: "Services", href: "/admin/services" },
  { key: "news", label: "News", href: "/admin/news" },
  { key: "announcements", label: "Announcements", href: "/admin/announcements" },
  { key: "leadership", label: "Leadership", href: "/admin/leadership" },
  { key: "leadership_history", label: "History", href: "/admin/leadership-history" },
  { key: "new_contacts", label: "New contacts", href: "/admin/contact-submissions" },
  { key: "gallery", label: "Gallery", href: "/admin/gallery" },
  { key: "open_jobs", label: "Open jobs", href: "/admin/careers" },
] as const;

export default function AdminDashboardPage() {
  const { data, isLoading } = useGetDashboardQuery();
  const counts = data?.counts ?? {};
  const user = useStoredUser();
  const firstName = user?.name?.split(" ")[0] || "Admin";

  return (
    <div className="ld-page space-y-5">
      <section className="ld-hero pl-5">
        <p className="ld-kicker">Control desk</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--ld-ink)] sm:text-4xl">
          Hello, {firstName}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ld-muted)]">
          A quieter command surface for hospital records — counts, inbox, and
          publishing activity in one place.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/admin/contact-submissions" className="ld-btn">
            Inbox
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/admin/media" className="ld-btn ld-btn--solid">
            Media library
          </Link>
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--ld-accent)]" />
        </div>
      ) : (
        <>
          <section aria-label="Key counts" className="ld-kpi">
            {KPI.map((item) => (
              <Link key={item.key} href={item.href} className="ld-kpi__cell">
                <p className="ld-kpi__value">{counts[item.key] ?? 0}</p>
                <p className="ld-kpi__label">{item.label}</p>
              </Link>
            ))}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="ld-panel">
              <div className="ld-panel__head">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[var(--ld-ink)]">
                    Recent contacts
                  </h3>
                  <p className="text-xs text-[var(--ld-faint)]">Public form submissions</p>
                </div>
                <Link
                  href="/admin/contact-submissions"
                  className="text-xs font-bold uppercase tracking-wide text-[var(--ld-accent)] hover:underline"
                >
                  Open inbox
                </Link>
              </div>
              {(data?.recentContacts ?? []).length === 0 ? (
                <p className="ld-empty m-3 text-sm">No recent contacts</p>
              ) : (
                <div className="ld-table-wrap">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.recentContacts.map((c) => (
                        <tr key={c.id}>
                          <td className="ld-table__name">{c.name}</td>
                          <td>{c.subject}</td>
                          <td>
                            <Badge variant={c.status === "new" ? "default" : "muted"}>
                              {c.status}
                            </Badge>
                          </td>
                          <td>
                            {formatDate(c.created_at, {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="ld-panel">
              <div className="ld-panel__head">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[var(--ld-ink)]">
                    Recent news
                  </h3>
                  <p className="text-xs text-[var(--ld-faint)]">Latest CMS articles</p>
                </div>
                <Link
                  href="/admin/news"
                  className="text-xs font-bold uppercase tracking-wide text-[var(--ld-accent)] hover:underline"
                >
                  Manage news
                </Link>
              </div>
              {(data?.recentNews ?? []).length === 0 ? (
                <p className="ld-empty m-3 text-sm">No recent news</p>
              ) : (
                <div className="ld-table-wrap">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.recentNews.map((n) => (
                        <tr key={n.id}>
                          <td className="ld-table__name">{n.title}</td>
                          <td>
                            <Badge variant="outline">{n.status || "draft"}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
