"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Mail,
  MapPin,
  ArrowUpRight,
  MessageSquare,
  Navigation,
  Phone,
  Send,
  Siren,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  useGetSettingsQuery,
  useSubmitContactMutation,
} from "@/store/slices/apiSlice";
import { SITE_NAME } from "@/lib/api";
import { formatPublicAddress, stripHtml, truncate } from "@/lib/utils";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import NovaReveal from "@/components/nova/NovaReveal";
import PageTransition from "@/components/motion/PageTransition";
import LocationMap from "@/components/shared/LocationMap";
import WorkingHoursDisplay from "@/components/shared/WorkingHoursDisplay";
import {
  DetailSectionHeader,
  DetailDivider,
  DetailLinkChip,
} from "@/components/shared/DetailShell";

/* ─── Channel Card Theme Config ─── */

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

      <PageBody className="nv-dstack !max-w-6xl">
          
          {/* ═══ SECTION 01: Channels ═══ */}
          <section className="nv-asec">
            <DetailSectionHeader
              eyebrow="01 · Ways to reach us"
              title="Pick the channel that suits you best"
              description="Visit, call, email, or check when the main desk is open."
            />
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-8">
              {channels.map((channel, i) => {
                const Icon = channel.icon;
                const cardContent = (
                  <>
                    <div>
                      <div className="nv-chan__top">
                        <span className="nv-chan__ico" aria-hidden>
                          <Icon />
                        </span>
                        <span className="nv-chan__index" aria-hidden>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <p className="nv-chan__label">{channel.label}</p>
                      <p className="nv-chan__value">{channel.value}</p>
                    </div>

                    <div className="nv-chan__foot">
                      <span>{channel.hint}</span>
                      {channel.action && (
                        <span className="nv-chan__go">
                          {channel.action}
                          <ArrowUpRight aria-hidden />
                        </span>
                      )}
                    </div>
                  </>
                );

                return (
                  <NovaReveal key={channel.label} from="up" delay={i * 0.08}>
                    {channel.href ? (
                      <a
                        href={channel.href}
                        target={channel.href.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="nv-chan"
                      >
                        {cardContent}
                      </a>
                    ) : (
                      <div className="nv-chan">{cardContent}</div>
                    )}
                  </NovaReveal>
                );
              })}
            </div>
          </section>

          <DetailDivider delay={0.02} />

          {/* ═══ SECTION 02: Find Us (Map & Visit Checklist) ═══ */}
          <section className="nv-asec">
            <DetailSectionHeader
              eyebrow="02 · Location & Map"
              title="Pinned exactly at the hospital main entrance"
              description="Use the interactive map below or get instant turn-by-turn navigation."
            />

            <div className="nv-dlayout mt-8">
              <NovaReveal from="up" delay={0.06} className="h-full">
                <div className="nv-map-frame">
                  <LocationMap
                    label={name}
                    latitude={settings?.latitude}
                    longitude={settings?.longitude}
                    mapsUrl={settings?.google_maps_url as string | undefined}
                    address={address}
                    className="h-full min-h-[25rem] w-full rounded-[15px]"
                  />
                </div>
              </NovaReveal>

              <NovaReveal from="up" delay={0.12} className="h-full">
                <div className="nv-dpanel flex h-full flex-col justify-between">
                  <div>
                    <div className="nv-dpanel__label">
                      <span className="nv-dpanel__icon" aria-hidden>
                        <Navigation />
                      </span>
                      <div>
                        <p className="nv-dpanel__kicker">Planning your visit</p>
                        <h3 className="nv-dpanel__title">Arrival details</h3>
                      </div>
                    </div>

                    <div className="grid gap-5">
                      {address && (
                        <div className="nv-vrow">
                          <span className="nv-vrow__ico" aria-hidden>
                            <Navigation />
                          </span>
                          <span>
                            <span className="nv-vrow__key">Campus address</span>
                            <span className="nv-vrow__val">{address}</span>
                          </span>
                        </div>
                      )}

                      <WorkingHoursDisplay />
                    </div>
                  </div>

                  {emergency && (
                    <a href={`tel:${emergency}`} className="nv-note nv-note--warn mt-6">
                      <span className="nv-note__ico" aria-hidden>
                        <Siren />
                      </span>
                      <span>
                        <span className="nv-vrow__key">24/7 emergency hotline</span>
                        <span className="nv-alert__title !mt-1 !text-[1.15rem]">
                          {emergency}
                        </span>
                      </span>
                    </a>
                  )}
                </div>
              </NovaReveal>
            </div>
          </section>

          <DetailDivider delay={0.02} />

          {/* ═══ SECTION 03: Contact Form ═══ */}
          <section className="nv-asec">
            <div className="nv-dlayout">
              <div className="grid gap-6">
                <DetailSectionHeader
                  eyebrow="03 · Send a message"
                  title="Tell us what you need and we'll route it"
                  description="Messages land directly with the patient liaison desk, who forward them to the right department the same day."
                />

                <div className="grid gap-3">
                  <NovaReveal from="up" delay={0.06}>
                    <div className="nv-note">
                      <span className="nv-note__ico" aria-hidden>
                        <MessageSquare />
                      </span>
                      <div>
                        <p className="nv-note__title">General enquiries</p>
                        <p className="nv-note__desc">
                          Appointments, medical records, billing questions, or general
                          hospital feedback.
                        </p>
                      </div>
                    </div>
                  </NovaReveal>

                  <NovaReveal from="up" delay={0.12}>
                    <div className="nv-note nv-note--warn">
                      <span className="nv-note__ico" aria-hidden>
                        <Siren />
                      </span>
                      <div>
                        <p className="nv-note__title">Urgent medical need?</p>
                        <p className="nv-note__desc">
                          Please do not send a web form. Call our emergency hotline or
                          visit emergency triage immediately.
                        </p>
                      </div>
                    </div>
                  </NovaReveal>
                </div>

                <DetailLinkChip href="/emergency">View Emergency Protocol</DetailLinkChip>
              </div>

              <div>
                <NovaReveal from="up" delay={0.08}>
                  <div className="nv-dpanel">
                    <div className="nv-dpanel__label">
                      <span className="nv-dpanel__icon" aria-hidden>
                        <Sparkles />
                      </span>
                      <div>
                        <p className="nv-dpanel__kicker">Direct messaging</p>
                        <h3 className="nv-dpanel__title">Contact form</h3>
                      </div>
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
                        className="nv-btn nv-btn--primary nv-btn--block nv-btn--lg"
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

                      <p className="nv-form__note">
                        Your personal information is kept strictly confidential.
                      </p>
                    </form>
                  </div>
                </NovaReveal>
              </div>
            </div>
          </section>

          {/* ═══ SECTION 04: Emergency Banner ═══ */}
          {emergency && (
            <>
              <DetailDivider delay={0.02} />
              <NovaReveal from="up" delay={0.05}>
                <div className="nv-alert">
                  <div className="nv-alert__main">
                    <span className="nv-alert__ico" aria-hidden>
                      <Siren />
                    </span>
                    <div>
                      <p className="nv-alert__kicker">
                        24 hours / 7 days emergency services
                      </p>
                      <p className="nv-alert__title">
                        Need immediate medical attention?
                      </p>
                    </div>
                  </div>

                  <a
                    href={`tel:${emergency}`}
                    className="nv-btn nv-btn--primary nv-btn--lg nv-alert__cta"
                  >
                    <Phone className="h-4 w-4" />
                    Call {emergency}
                  </a>
                </div>
              </NovaReveal>
            </>
          )}
      </PageBody>
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

/**
 * A floating-label field.
 *
 * The label moves on `:placeholder-shown`, which is why the inputs carry a
 * single-space placeholder — nova-page.css keys the resting and raised states
 * off it, so nothing here has to track focus in React state.
 */
function FloatingField({
  label,
  value,
  onChange,
  type = "text",
  required,
  multiline,
}: FloatingFieldProps) {
  return (
    <div className="nv-field">
      {multiline ? (
        <textarea
          rows={4}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
        />
      )}
      <label className="nv-field__label">
        {label}
        {required && <span className="nv-field__req"> *</span>}
      </label>
    </div>
  );
}
