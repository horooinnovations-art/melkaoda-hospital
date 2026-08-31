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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getImageFromItem } from "@/lib/media";
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
  const image = getImageFromItem(event as unknown as Record<string, unknown>);

  const badges: DetailBadge[] = [];
  if (event.event_date) badges.push({ icon: Calendar, label: formatDate(event.event_date), tone: "teal" });
  if (event.location) badges.push({ icon: MapPin, label: event.location, tone: "coral" });
  if (event.status) badges.push({ label: event.status, tone: "glass" });

  return (
    <DetailShell
      title={event.title}
      subtitle={event.location}
      image={image}
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
          <div className="nv-dpanel__label">
            <span className="nv-dpanel__icon" aria-hidden>
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <p className="nv-dpanel__kicker">About the event</p>
              <h3 className="nv-dpanel__title">What to expect</h3>
            </div>
          </div>
          {event.description.includes("<") ? (
            <Prose html={event.description} />
          ) : (
            <p className="nv-dplain">{event.description}</p>
          )}
        </DetailPanel>
      ) : null}

      <DetailDivider />

      <DetailPanel delay={0.14} tone={3}>
        <div className="nv-dpanel__label">
          <span className="nv-dpanel__icon" aria-hidden>
            <CalendarCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="nv-dpanel__kicker">Reserve your place</p>
            <h3 className="nv-dpanel__title">Register for this event</h3>
          </div>
        </div>
        <form onSubmit={handleRegister} className="mt-2 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="nv-label">Name *</label>
              <Input className="nv-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="nv-label">Email *</label>
              <Input className="nv-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="nv-label">Phone *</label>
              <Input className="nv-input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="nv-label">Organization</label>
              <Input className="nv-input" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="nv-label">Notes</label>
            <Textarea className="nv-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" disabled={registering} className="nv-btn nv-btn--primary">
            {registering ? "Submitting…" : "Register"}
          </button>
        </form>
      </DetailPanel>

      <DetailDivider delay={0.12} />
      <div className="nv-dfooter">
        <DetailLinkChip href="/events">All events</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
