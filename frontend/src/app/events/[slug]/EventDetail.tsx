"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Calendar, MapPin, CalendarCheck, FileText } from "lucide-react";
import { useGetResourceItemQuery, useRegisterEventMutation } from "@/store/slices/apiSlice";
import Prose from "@/components/shared/Prose";
import EmptyState from "@/components/shared/EmptyState";
import { DetailSkeleton } from "@/components/shared/Skeleton";
import DetailShell, {
  DetailDivider,
  DetailLinkChip,
  DetailPanel,
  DetailSectionHeader,
  type DetailBadge,
} from "@/components/shared/DetailShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import type { Event } from "@/lib/types";

export default function EventDetail({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useGetResourceItemQuery({
    resource: "events",
    idOrSlug: slug,
  });
  const [registerEvent, { isLoading: registering }] = useRegisterEventMutation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    notes: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerEvent({ slug, data: form }).unwrap();
      toast.success("Registration submitted!");
      setForm({ name: "", email: "", phone: "", organization: "", notes: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    }
  };

  if (isLoading) {
    return (
      <DetailShell title="Loading event" backHref="/events" backLabel="All Events" width="wide">
        <DetailPanel>
          <DetailSkeleton />
        </DetailPanel>
      </DetailShell>
    );
  }

  if (isError || !data) {
    return (
      <DetailShell title="Event not found" backHref="/events" backLabel="All Events" width="wide">
        <DetailPanel>
          <EmptyState title="Event not found" />
        </DetailPanel>
      </DetailShell>
    );
  }

  const event = data as Event;

  const badges: DetailBadge[] = [];
  if (event.event_date) badges.push({ icon: Calendar, label: formatDate(event.event_date), tone: "teal" });
  if (event.location) badges.push({ icon: MapPin, label: event.location, tone: "coral" });
  if (event.status) badges.push({ label: event.status, tone: "glass" });

  return (
    <DetailShell
      title={event.title}
      subtitle={event.location}
      badges={badges}
      backHref="/events"
      backLabel="All Events"
      width="wide"
    >
      <DetailSectionHeader
        eyebrow="Events"
        title="Event details"
        description="Schedule, location, and registration for this hospital gathering."
      />

      {event.description ? (
        <DetailPanel tone={2}>
          <div className="g-detail-panel__label">
            <span className="g-detail-panel__icon" aria-hidden>
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <p className="g-detail-panel__kicker">About the event</p>
              <h3 className="g-detail-panel__title">What to expect</h3>
            </div>
          </div>
          {event.description.includes("<") ? (
            <Prose html={event.description} />
          ) : (
            <p className="g-detail-plain">{event.description}</p>
          )}
        </DetailPanel>
      ) : null}

      <DetailDivider />

      <DetailPanel delay={0.14} tone={3}>
        <div className="g-detail-panel__label">
          <span className="g-detail-panel__icon" aria-hidden>
            <CalendarCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="g-detail-panel__kicker">Reserve your place</p>
            <h3 className="g-detail-panel__title">Register for this event</h3>
          </div>
        </div>
        <form onSubmit={handleRegister} className="mt-2 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Name *</label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Email *</label>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Phone *</label>
              <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Organization</label>
              <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Notes</label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button type="submit" disabled={registering}>
            {registering ? "Submitting…" : "Register"}
          </Button>
        </form>
      </DetailPanel>

      <DetailDivider delay={0.12} />
      <div className="g-detail-footer">
        <DetailLinkChip href="/events">All events</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
