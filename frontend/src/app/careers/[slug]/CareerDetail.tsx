"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, MapPin, Briefcase, FileText } from "lucide-react";
import { useGetResourceItemQuery, useApplyCareerMutation } from "@/store/slices/apiSlice";
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
import type { Career } from "@/lib/types";

export default function CareerDetail({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useGetResourceItemQuery({
    resource: "careers",
    idOrSlug: slug,
  });
  const [applyCareer, { isLoading: applying }] = useApplyCareerMutation();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    cover_letter: "",
  });
  const [resume, setResume] = useState<File | null>(null);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) {
      toast.error("Please attach your resume");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("resume", resume);
    try {
      await applyCareer({ slug, formData: fd }).unwrap();
      toast.success("Application submitted successfully!");
      setForm({ first_name: "", last_name: "", email: "", phone: "", cover_letter: "" });
      setResume(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Application failed");
    }
  };

  if (isLoading) {
    return (
      <DetailShell title="Loading opening" backHref="/careers" backLabel="All Openings" width="wide">
        <DetailPanel>
          <DetailSkeleton />
        </DetailPanel>
      </DetailShell>
    );
  }

  if (isError || !data) {
    return (
      <DetailShell title="Position not found" backHref="/careers" backLabel="All Openings" width="wide">
        <DetailPanel>
          <EmptyState title="Position not found" />
        </DetailPanel>
      </DetailShell>
    );
  }

  const job = data as Career;

  const badges: DetailBadge[] = [];
  if (job.department) badges.push({ icon: Building2, label: job.department, tone: "teal" });
  if (job.location) badges.push({ icon: MapPin, label: job.location, tone: "coral" });
  if (job.employment_type) badges.push({ icon: Briefcase, label: job.employment_type, tone: "brass" });

  return (
    <DetailShell
      title={job.title}
      subtitle={job.department}
      badges={badges}
      backHref="/careers"
      backLabel="All Openings"
      width="wide"
    >
      <DetailSectionHeader
        eyebrow="Careers"
        title="Role overview"
        description="Responsibilities, requirements, and how to apply."
      />

      {job.description ? (
        <DetailPanel tone={2}>
          <div className="g-detail-panel__label">
            <span className="g-detail-panel__icon" aria-hidden>
              <Briefcase className="h-4 w-4" />
            </span>
            <div>
              <p className="g-detail-panel__kicker">Position brief</p>
              <h3 className="g-detail-panel__title">Role description</h3>
            </div>
          </div>
          {job.description.includes("<") ? (
            <Prose html={job.description} />
          ) : (
            <p className="g-detail-plain">{job.description}</p>
          )}
        </DetailPanel>
      ) : null}

      <DetailDivider />

      <DetailPanel delay={0.14} tone={3}>
        <div className="g-detail-panel__label">
          <span className="g-detail-panel__icon" aria-hidden>
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="g-detail-panel__kicker">Join the team</p>
            <h3 className="g-detail-panel__title">Apply for this position</h3>
          </div>
        </div>
        <form onSubmit={handleApply} className="mt-2 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">First name *</label>
              <Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Last name *</label>
              <Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Email *</label>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Phone *</label>
              <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Cover letter</label>
            <Textarea rows={4} value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Resume *</label>
            <Input type="file" accept=".pdf,.doc,.docx" required onChange={(e) => setResume(e.target.files?.[0] ?? null)} />
          </div>
          <Button type="submit" disabled={applying}>
            {applying ? "Submitting…" : "Submit Application"}
          </Button>
        </form>
      </DetailPanel>

      <DetailDivider delay={0.12} />
      <div className="g-detail-footer">
        <DetailLinkChip href="/careers">All openings</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
