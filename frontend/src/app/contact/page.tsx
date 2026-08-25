"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Send,
  Siren,
  Sparkles,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  useGetSettingsQuery,
  useSubmitContactMutation,
} from "@/store/slices/apiSlice";
import { SITE_NAME } from "@/lib/api";
import { cn, formatPublicAddress, stripHtml, truncate } from "@/lib/utils";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
import PageTransition from "@/components/motion/PageTransition";
import LocationMap from "@/components/shared/LocationMap";
import WorkingHoursDisplay from "@/components/shared/WorkingHoursDisplay";
import {
  DetailSectionHeader,
  DetailDivider,
  DetailLinkChip,
} from "@/components/shared/DetailShell";

/* ─── Channel Card Theme Config ─── */
const CHANNEL_THEMES = [
  {
    gradient: "linear-gradient(145deg, rgba(236, 253, 245, 0.95), rgba(209, 250, 229, 0.6))",
    border: "1px solid rgba(16, 185, 129, 0.25)",
    iconBg: "linear-gradient(135deg, #059669, #10b981)",
    iconColor: "#ffffff",
    badgeBg: "rgba(16, 185, 129, 0.12)",
    badgeColor: "#047857",
  },
  {
    gradient: "linear-gradient(145deg, rgba(239, 246, 255, 0.95), rgba(219, 234, 254, 0.6))",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    iconBg: "linear-gradient(135deg, #2563eb, #3b82f6)",
    iconColor: "#ffffff",
    badgeBg: "rgba(59, 130, 246, 0.12)",
    badgeColor: "#1d4ed8",
  },
  {
    gradient: "linear-gradient(145deg, rgba(245, 243, 255, 0.95), rgba(237, 233, 254, 0.6))",
    border: "1px solid rgba(139, 92, 246, 0.25)",
    iconBg: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
    iconColor: "#ffffff",
    badgeBg: "rgba(139, 92, 246, 0.12)",
    badgeColor: "#6d28d9",
  },
  {
    gradient: "linear-gradient(145deg, rgba(254, 243, 199, 0.85), rgba(253, 230, 138, 0.5))",
    border: "1px solid rgba(245, 158, 11, 0.25)",
    iconBg: "linear-gradient(135deg, #d97706, #f59e0b)",
    iconColor: "#ffffff",
    badgeBg: "rgba(245, 158, 11, 0.12)",
    badgeColor: "#b45309",
  },
];

export default function ContactPage() {
  const { data: settings } = useGetSettingsQuery();
  const [submitContact, { isLoading }] = useSubmitContactMutation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    department: "",
  });

  const name = (settings?.site_name as string) || SITE_NAME;
  const address = formatPublicAddress(settings?.address as string | undefined);
  const phone = settings?.phone as string | undefined;
  const email = settings?.email as string | undefined;
  const hours = settings?.hours as string | undefined;
  const emergency = (settings?.emergency_phone as string) || phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitContact(form).unwrap();
      toast.success("Message sent successfully! Our team will get back to you shortly.");
      setForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        department: "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const channels = [
    address && {
      icon: MapPin,
      label: "Visit us",
      value: address,
      hint: "Main hospital entrance & reception desk",
      action: "Get Directions",
      href: settings?.google_maps_url as string | undefined,
    },
    phone && {
      icon: Phone,
      label: "Call switchboard",
      value: phone,
      href: `tel:${phone}`,
      hint: "Appointments & general enquiries",
      action: "Call Now",
    },
    email && {
      icon: Mail,
      label: "Email us",
      value: email,
      href: `mailto:${email}`,
      hint: "Fast response within one business day",
      action: "Send Email",
    },
    hours && {
      icon: Clock,
      label: "Opening hours",
      value: `Every day ${hours}`,
      hint: `Visiting hours: ${(settings?.visiting_hours as string) || "Daily: 02:30 – 06:30 and 07:30 – 11:30 LT"}`,
      action: "24/7 Care",
    },
  ].filter(Boolean) as Array<{
    icon: LucideIcon;
    label: string;
    value: string;
    href?: string;
    hint: string;
    action?: string;
  }>;

  const visitFacts = [
    address && { icon: Navigation, label: "Campus Address", value: address },
    hours && { icon: Clock, label: "Regular Hours", value: hours },
    phone && {
      icon: Phone,
      label: "Main Switchboard",
      value: phone,
      href: `tel:${phone}`,
    },
  ].filter(Boolean) as Array<{
    icon: LucideIcon;
    label: string;
    value: string;
    href?: string;
  }>;

  return (
    <PageTransition>
      <PageHero
        title="Contact"
        eyebrow="Reach Gambo General Hospital"
        subtitle={
          settings?.about
            ? truncate(stripHtml(String(settings.about)), 170)
            : (settings?.tagline as string | undefined)
        }
        breadcrumbs={[{ label: "Contact" }]}
      />

      <div className="g-pagebody g-pagebody--detail">
        <div className="g-pagebody__aura" aria-hidden />
        <div className="g-pagebody__mesh" aria-hidden />

        <div className="g-pagebody__inner g-detail-stack g-contact relative z-[1] mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          
          {/* ═══ SECTION 01: Channels ═══ */}
          <section className="g-contact-section">
            <DetailSectionHeader
              eyebrow="01 · Ways to reach us"
              title="Pick the channel that suits you best"
              description="Visit, call, email, or check when the main desk is open."
            />
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-8">
              {channels.map((channel, i) => {
                const Icon = channel.icon;
                const theme = CHANNEL_THEMES[i % CHANNEL_THEMES.length];
                
                const cardContent = (
                  <motion.div
                    whileHover={{ y: -5, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-md"
                    style={{
                      background: theme.gradient,
                      border: theme.border,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm"
                          style={{ background: theme.iconBg, color: theme.iconColor }}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <span
                          className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase"
                          style={{ background: theme.badgeBg, color: theme.badgeColor }}
                        >
                          0{i + 1}
                        </span>
                      </div>

                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        {channel.label}
                      </p>
                      <h3 className="font-display text-base font-bold leading-snug text-slate-900 mb-2">
                        {channel.value}
                      </h3>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-900/10 flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">
                        {channel.hint}
                      </span>
                      {channel.action && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
                          {channel.action}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </motion.div>
                );

                return (
                  <Reveal key={channel.label} delay={i * 0.06}>
                    {channel.href ? (
                      <a
                        href={channel.href}
                        target={channel.href.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="block h-full"
                      >
                        {cardContent}
                      </a>
                    ) : (
                      cardContent
                    )}
                  </Reveal>
                );
              })}
            </div>
          </section>

          <DetailDivider delay={0.02} />

          {/* ═══ SECTION 02: Find Us (Map & Visit Checklist) ═══ */}
          <section className="g-contact-section">
            <DetailSectionHeader
              eyebrow="02 · Location & Map"
              title="Pinned exactly at the hospital main entrance"
              description="Use the interactive map below or get instant turn-by-turn navigation."
            />

            <div className="grid gap-8 lg:grid-cols-12 items-stretch mt-8">
              
              {/* Map Card */}
              <div className="lg:col-span-7 flex flex-col">
                <Reveal delay={0.06} className="h-full">
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <LocationMap
                      label={name}
                      latitude={settings?.latitude}
                      longitude={settings?.longitude}
                      mapsUrl={settings?.google_maps_url as string | undefined}
                      address={address}
                      className="h-full min-h-[26rem] w-full rounded-xl"
                    />
                  </div>
                </Reveal>
              </div>

              {/* Planning Visit Card */}
              <div className="lg:col-span-5 flex flex-col">
                <Reveal delay={0.1} className="h-full">
                  <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-emerald-600/20 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 p-6 sm:p-8 shadow-sm">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                          <Navigation className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                            Planning your visit
                          </p>
                          <h3 className="font-display text-lg font-bold text-slate-900">
                            Arrival Details
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-5 my-6">
                        {address && (
                          <div className="flex items-start gap-3 text-sm">
                            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-emerald-600/30 bg-emerald-50 text-emerald-700">
                              <Navigation className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="block text-xs font-semibold text-slate-500">
                                Campus Address
                              </span>
                              <span className="font-bold text-slate-900">{address}</span>
                            </div>
                          </div>
                        )}

                        {/* Working & Visiting Hours Matching Image 2 */}
                        <WorkingHoursDisplay variant="light" />
                      </div>
                    </div>

                    {/* Emergency Call Box */}
                    {emergency && (
                      <a
                        href={`tel:${emergency}`}
                        className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/80 p-4 transition-all hover:border-rose-300 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600 text-white shadow-sm">
                            <Siren className="h-5 w-5 animate-pulse" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-rose-700">
                              24/7 Emergency Hotline
                            </span>
                            <span className="font-display text-base font-extrabold text-slate-900">
                              {emergency}
                            </span>
                          </div>
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-rose-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    )}
                  </div>
                </Reveal>
              </div>

            </div>
          </section>

          <DetailDivider delay={0.02} />

          {/* ═══ SECTION 03: Contact Form ═══ */}
          <section className="g-contact-section">
            <div className="grid gap-8 lg:grid-cols-12 items-start">
              
              {/* Left Info & Badges */}
              <div className="lg:col-span-5 space-y-6">
                <DetailSectionHeader
                  eyebrow="03 · Send a message"
                  title="Tell us what you need and we'll route it"
                  description="Messages land directly with the patient liaison desk, who forward them to the right department the same day."
                />

                <div className="space-y-4 pt-2">
                  <Reveal delay={0.06}>
                    <div className="flex items-start gap-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">General Enquiries</h4>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          Appointments, medical records, billing questions, or general hospital feedback.
                        </p>
                      </div>
                    </div>
                  </Reveal>

                  <Reveal delay={0.1}>
                    <div className="flex items-start gap-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
                        <Siren className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">Urgent Medical Need?</h4>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          Please do not send a web form. Call our emergency hotline or visit emergency triage immediately.
                        </p>
                      </div>
                    </div>
                  </Reveal>
                </div>

                <DetailLinkChip href="/emergency">View Emergency Protocol</DetailLinkChip>
              </div>

              {/* Form Card */}
              <div className="lg:col-span-7">
                <Reveal delay={0.08}>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                    <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          Direct Messaging
                        </span>
                        <h3 className="font-display text-xl font-bold text-slate-900">
                          Contact Form
                        </h3>
                      </div>
                      <Sparkles className="h-5 w-5 text-emerald-500" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FloatingField
                          label="Full name"
                          required
                          value={form.name}
                          onChange={(v) => setForm({ ...form, name: v })}
                        />
                        <FloatingField
                          label="Email address"
                          type="email"
                          required
                          value={form.email}
                          onChange={(v) => setForm({ ...form, email: v })}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FloatingField
                          label="Phone number"
                          type="tel"
                          value={form.phone}
                          onChange={(v) => setForm({ ...form, phone: v })}
                        />
                        <FloatingField
                          label="Target Department"
                          value={form.department}
                          onChange={(v) => setForm({ ...form, department: v })}
                        />
                      </div>

                      <FloatingField
                        label="Subject"
                        required
                        value={form.subject}
                        onChange={(v) => setForm({ ...form, subject: v })}
                      />

                      <FloatingField
                        label="How can we help?"
                        required
                        multiline
                        value={form.message}
                        onChange={(v) => setForm({ ...form, message: v })}
                      />

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-800 disabled:opacity-60"
                      >
                        {isLoading ? (
                          <>Sending message…</>
                        ) : (
                          <>
                            Send Message
                            <Send className="h-4 w-4" />
                          </>
                        )}
                      </button>

                      <p className="text-center text-xs text-slate-400">
                        🔒 Your personal information is kept strictly confidential.
                      </p>
                    </form>
                  </div>
                </Reveal>
              </div>

            </div>
          </section>

          {/* ═══ SECTION 04: Emergency Banner ═══ */}
          {emergency && (
            <>
              <DetailDivider delay={0.02} />
              <Reveal delay={0.05} fadeOut={false}>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-md">
                      <Siren className="h-7 w-7 text-rose-300 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-300">
                        24 Hours / 7 Days Emergency Services
                      </p>
                      <p className="font-display text-xl sm:text-2xl font-black text-white">
                        Need Immediate Medical Attention?
                      </p>
                    </div>
                  </div>

                  <a
                    href={`tel:${emergency}`}
                    className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-rose-500 px-6 py-3.5 text-sm font-black text-white shadow-lg transition-all hover:bg-rose-600 hover:scale-105"
                  >
                    <Phone className="h-4 w-4 fill-current" />
                    Call {emergency}
                  </a>
                </div>
              </Reveal>
            </>
          )}

        </div>
      </div>
    </PageTransition>
  );
}

interface FloatingFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  multiline?: boolean;
}

function FloatingField({
  label,
  value,
  onChange,
  type = "text",
  required,
  multiline,
}: FloatingFieldProps) {
  return (
    <div className="relative">
      {multiline ? (
        <textarea
          rows={4}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          className="peer w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 pt-6 pb-2 text-sm text-slate-900 font-medium placeholder-transparent focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          className="peer w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 pt-6 pb-2 text-sm text-slate-900 font-medium placeholder-transparent focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      )}
      <label className="pointer-events-none absolute left-4 top-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-slate-500 peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-emerald-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    </div>
  );
}
