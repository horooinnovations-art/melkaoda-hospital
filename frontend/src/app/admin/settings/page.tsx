"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Save,
  Building,
  Palette,
  Contact,
  MapPin,
  Share2,
  Clock,
  FileText,
  ClipboardList,
  Download,
  Info,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGetAdminSettingsQuery, useUpdateAdminSettingsMutation } from "@/store/adminApi";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { resolveMediaUrl } from "@/lib/media";
import {
  buildHoursValue,
  cn,
  commonHours,
  splitHoursByDay,
  WEEK_DAYS,
} from "@/lib/utils";

type FieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "email"
  | "tel"
  | "color"
  | "switch"
  | "number"
  | "select"
  | "file"
  | "features";

interface SettingField {
  key: string;
  label: string;
  type: FieldType;
  options?: { label: string; value: string }[];
  placeholder?: string;
  hint?: string;
  colSpan?: 1 | 2;
  minHeight?: string;
}

interface SettingTab {
  id: string;
  label: string;
  icon: React.ElementType;
  fields: SettingField[];
}

const TABS: SettingTab[] = [
  {
    id: "general",
    label: "General",
    icon: Building,
    fields: [
      { key: "organization_name", label: "Organization Name", type: "text", colSpan: 2 },
      { key: "organization_tagline", label: "Tagline", type: "text", colSpan: 2 },
      { key: "organization_description", label: "Description", type: "textarea", colSpan: 2 },
      { key: "logo", label: "Logo", type: "file", colSpan: 1 },
      { key: "favicon", label: "Favicon", type: "file", colSpan: 1 },
      { key: "home_features_title", label: "Homepage Features Title", type: "text", colSpan: 2 },
      { key: "home_features_subtitle", label: "Homepage Features Subtitle", type: "textarea", colSpan: 2 },
      { key: "home_features", label: "Homepage Features", type: "features", colSpan: 2 },
    ],
  },
  {
    id: "theme",
    label: "Theme & Design",
    icon: Palette,
    fields: [
      { key: "theme_primary_color", label: "Primary Color", type: "color" },
      { key: "theme_secondary_color", label: "Secondary Color", type: "color" },
      { key: "theme_accent_color", label: "Accent Color", type: "color" },
      { key: "theme_success_color", label: "Success Color", type: "color" },
      { key: "theme_warning_color", label: "Warning Color", type: "color" },
      { key: "theme_error_color", label: "Error Color", type: "color" },
      { key: "theme_background_color", label: "Background Color", type: "color" },
      { key: "theme_surface_color", label: "Surface Color", type: "color" },
      { key: "theme_text_primary", label: "Text Primary", type: "color" },
      { key: "theme_text_secondary", label: "Text Secondary", type: "color" },
      { key: "theme_font_family", label: "Font Family", type: "text" },
      { key: "theme_border_radius", label: "Border Radius (px)", type: "number" },
      { key: "header_background_color", label: "Header Background", type: "color" },
      { key: "header_text_color", label: "Header Text", type: "color" },
      { key: "header_sticky", label: "Sticky Header", type: "switch" },
      { key: "header_transparent", label: "Transparent Header", type: "switch" },
      { key: "header_custom_html", label: "Header Custom HTML", type: "textarea", colSpan: 2 },
      { key: "footer_background_color", label: "Footer Background", type: "color" },
      { key: "footer_text_color", label: "Footer Text", type: "color" },
      { key: "footer_show_social_links", label: "Show Social Links", type: "switch" },
      { key: "footer_show_quick_links", label: "Show Quick Links", type: "switch" },
      { key: "footer_copyright_text", label: "Copyright Text", type: "text", colSpan: 2 },
      { key: "footer_custom_html", label: "Footer Custom HTML", type: "textarea", colSpan: 2 },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    icon: Contact,
    fields: [
      { key: "contact_email", label: "Public Contact Email", type: "email" },
      { key: "contact_phone", label: "Primary Phone", type: "tel" },
      { key: "contact_fax", label: "Fax Number", type: "tel" },
      { key: "contact_mobile", label: "Mobile Number", type: "tel" },
      { key: "emergency_phone", label: "Emergency Phone", type: "tel" },
      { key: "mail_from_address", label: "System Mail From Address", type: "email" },
      { key: "mail_from_name", label: "System Mail From Name", type: "text" },
    ],
  },
  {
    id: "address",
    label: "Address",
    icon: MapPin,
    fields: [
      {
        key: "address_line1",
        label: "Address Line 1",
        type: "text",
        colSpan: 2,
        placeholder: "Street / kebele only — put city & region in the fields below",
      },
      { key: "address_line2", label: "Address Line 2", type: "text", colSpan: 2 },
      {
        key: "location_label",
        label: "Short Location Label",
        type: "text",
        colSpan: 2,
        placeholder: "e.g. Siraro District · Oromia",
        hint: "Shown on the home hero. Leave blank to compose it from City and State, or to show nothing.",
      },
      { key: "city", label: "City", type: "text" },
      { key: "state", label: "State/Province", type: "text" },
      { key: "zip_code", label: "ZIP/Postal Code", type: "text" },
      { key: "country", label: "Country", type: "text" },
      { key: "latitude", label: "Latitude", type: "text", placeholder: "e.g. 9.329122" },
      { key: "longitude", label: "Longitude", type: "text", placeholder: "e.g. 41.446524" },
      { key: "google_maps_url", label: "Google Maps URL", type: "text", colSpan: 2 },
      { key: "google_maps_api_key", label: "Google Maps API Key", type: "text", colSpan: 2 },
    ],
  },
  {
    id: "social",
    label: "Social Media",
    icon: Share2,
    fields: [
      { key: "social_facebook", label: "Facebook URL", type: "text", colSpan: 2 },
      { key: "social_twitter", label: "Twitter (X) URL", type: "text", colSpan: 2 },
      { key: "social_instagram", label: "Instagram URL", type: "text", colSpan: 2 },
      { key: "social_linkedin", label: "LinkedIn URL", type: "text", colSpan: 2 },
      { key: "social_youtube", label: "YouTube URL", type: "text", colSpan: 2 },
      { key: "social_telegram", label: "Telegram URL", type: "text", colSpan: 2 },
    ],
  },
  {
    id: "hours",
    label: "Working Hours",
    icon: Clock,
    fields: [
      { key: "hours_same_everyday", label: "Same hours every day", type: "switch", colSpan: 2 },
      { key: "hours", label: "Hours", type: "text", placeholder: "24hrs", colSpan: 2 },
      { key: "visiting_hours", label: "Visiting Hours", type: "text", placeholder: "Daily: 02:30 – 06:30 and 07:30 – 11:30 LT", colSpan: 2, hint: "Shown separately from Working Hours — for family/friends visiting patients." },
    ],
  },
  {
    id: "about",
    label: "About Page",
    icon: FileText,
    fields: [
      {
        key: "organization_description",
        label: "Our Story",
        type: "richtext",
        colSpan: 2,
        minHeight: "180px",
        hint: "Shown in the About page “Our story” section.",
      },
      {
        key: "purpose",
        label: "Our Purpose",
        type: "richtext",
        colSpan: 2,
        minHeight: "200px",
        hint: "Opens the About page, before Mission & Vision. One or two paragraphs on why the hospital exists and who it serves. Leave blank to hide the section.",
      },
      {
        key: "mission",
        label: "Mission",
        type: "richtext",
        colSpan: 2,
        minHeight: "200px",
        hint: "Why the hospital exists — supports lists, headings, and formatting.",
      },
      {
        key: "vision",
        label: "Vision",
        type: "richtext",
        colSpan: 2,
        minHeight: "160px",
        hint: "Where the hospital is going.",
      },
      {
        key: "core_values",
        label: "Core Values",
        type: "richtext",
        colSpan: 2,
        minHeight: "280px",
        hint: "Use a heading for each value (e.g. Compassion, Integrity) with one short bold statement under it. Every value you add is shown — there is no cap.",
      },
      {
        key: "patient_care_promise",
        label: "Our Patient Care Promise",
        type: "richtext",
        colSpan: 2,
        minHeight: "260px",
        hint: "Shown after Core Values. The values written as commitments a patient can hold the hospital to — a numbered or bulleted list works best. Leave blank to hide the section.",
      },
      {
        key: "history",
        label: "History / Journey",
        type: "richtext",
        colSpan: 2,
        minHeight: "320px",
        hint: "Use headings for eras or years (e.g. Foundation, Growth & Expansion). Text under each heading becomes the timeline.",
      },
      {
        key: "awards_accreditations",
        label: "Awards & Recognition",
        type: "richtext",
        colSpan: 2,
        minHeight: "280px",
        hint: "Use a heading for each award or recognition, with details underneath.",
      },
    ],
  },
  {
    id: "patient-guide",
    label: "Patient Guide",
    icon: ClipboardList,
    fields: [
      {
        key: "patient_guide_intro",
        label: "Intro",
        type: "textarea",
        colSpan: 2,
        placeholder:
          "Everything you need to plan your visit and make the most of your healthcare experience.",
        hint: "Opening line under the Patient Guide title.",
      },
      {
        key: "visiting_hours",
        label: "Visiting Hours",
        type: "text",
        colSpan: 2,
        placeholder: "Daily: 02:30 – 06:30 and 07:30 – 11:30 LT",
        hint: "Shared with the Working Hours tab — editing it in either place updates the same value.",
      },
      {
        key: "patient_guide_insurance",
        label: "Insurance & Payment",
        type: "richtext",
        colSpan: 2,
        minHeight: "200px",
        hint: "Accepted payment methods and cover. Use a numbered or bulleted list — each item becomes a row on the page.",
      },
      {
        key: "patient_guide_directions",
        label: "Location & Directions",
        type: "richtext",
        colSpan: 2,
        minHeight: "160px",
        hint: "How to reach the hospital. Leave empty to fall back to the address in the Address tab.",
      },
      {
        key: "patient_guide_documents",
        label: "Documents to Bring",
        type: "richtext",
        colSpan: 2,
        minHeight: "200px",
        hint: "One item per list entry — ID, previous records, medication list, CBHI card, and so on.",
      },
      {
        key: "patient_guide_admission",
        label: "Admission & Discharge",
        type: "richtext",
        colSpan: 2,
        minHeight: "200px",
        hint: "Optional. The steps a patient goes through from registration to discharge.",
      },
      {
        key: "patient_guide_additional",
        label: "Additional Information",
        type: "richtext",
        colSpan: 2,
        minHeight: "200px",
        hint: "Ward etiquette and visiting rules — visitor limits, critical-care access, infection prevention.",
      },
      {
        key: "patient_guide_tips",
        label: "Tips for Your Visit",
        type: "richtext",
        colSpan: 2,
        minHeight: "220px",
        hint: "Use a heading for each tip (e.g. Arrive Early) with a short line under it. Headings become tip cards.",
      },
      {
        key: "patient_guide_help",
        label: "Need More Help?",
        type: "textarea",
        colSpan: 2,
        placeholder:
          "Our patient services team is happy to answer any question before you arrive.",
        hint: "Closing copy above the Contact Us button.",
      },
    ],
  },
  {
    id: "downloads",
    label: "Downloads",
    icon: Download,
    fields: [
      {
        key: "downloads_intro",
        label: "Intro",
        type: "textarea",
        colSpan: 2,
        placeholder:
          "Access forms, guides, and essential resources for patients, partners, and healthcare professionals.",
        hint: "Opening line under the Downloads title. The files themselves live in Admin → Downloads.",
      },
      {
        key: "downloads_note",
        label: "Closing Note",
        type: "textarea",
        colSpan: 2,
        placeholder:
          "Cannot find what you need? Contact us and we will send the document to you.",
        hint: "Optional note shown under the file list.",
      },
    ],
  },
  {
    id: "additional",
    label: "Additional",
    icon: Info,
    fields: [
      {
        key: "founded_year",
        label: "Founded Year",
        type: "number",
        placeholder: "1942",
        hint: "Year the hospital was founded.",
      },
      {
        key: "website_url",
        label: "Website URL",
        type: "text",
        placeholder: "https://www.example.com",
      },
      {
        key: "total_patients",
        label: "Total Patients Served",
        type: "number",
        placeholder: "1500000",
        hint: 'Total number of patients served. Values over 1,000,000 will be displayed as "X.XM+" (e.g., 3.2M+) on the home page.',
      },
      {
        key: "patients_label",
        label: "Patients Metric Label",
        type: "text",
        placeholder: "Catchment Population",
        hint: 'Label displayed on the home page metric card for total patients. Defaults to "Catchment Population" if left empty.',
      },
      {
        key: "years_experience",
        label: "Years of Excellence",
        type: "number",
        placeholder: "84",
        hint: "Number of years of excellence displayed on the home page.",
      },
      {
        key: "registration_number",
        label: "Registration Number",
        type: "text",
      },
      {
        key: "tax_id",
        label: "Tax ID",
        type: "text",
      },
      {
        key: "license_number",
        label: "License Number",
        type: "text",
      },
      {
        key: "meta_description",
        label: "Global Meta Description",
        type: "textarea",
        colSpan: 2,
      },
      {
        key: "meta_keywords",
        label: "Global Meta Keywords",
        type: "text",
        colSpan: 2,
      },
      {
        key: "analytics_code",
        label: "Google Analytics / Tracking Code",
        type: "textarea",
        colSpan: 2,
      },
    ],
  },
];

export default function AdminSettingsPage() {
  const { data, isLoading } = useGetAdminSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateAdminSettingsMutation();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [values, setValues] = useState<Record<string, unknown>>({});
  
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;

    // Prefer canonical About keys; fall back to legacy about_* / alias keys so
    // existing content still appears in the editors after the field rewire.
    setValues((prev) => ({
      ...prev,
      ...data,
      organization_description:
        (data.organization_description as string) ||
        (data.about as string) ||
        (data.description as string) ||
        "",
      mission: (data.mission as string) || (data.about_mission as string) || "",
      vision: (data.vision as string) || (data.about_vision as string) || "",
      core_values:
        (data.core_values as string) || (data.values as string) || "",
      history: (data.history as string) || (data.about_history as string) || "",
      awards_accreditations:
        (data.awards_accreditations as string) || (data.awards as string) || "",
      hours: (data.hours as string) || "24hrs",
      visiting_hours:
        (data.visiting_hours as string) ||
        "Daily: 02:30 – 06:30 and 07:30 – 11:30 LT",
      hours_same_everyday:
        data.hours_same_everyday !== undefined
          ? data.hours_same_everyday
          : "1",
    }));
  }, [data]);

  useEffect(() => {
    if (logo) setLogoPreview(URL.createObjectURL(logo));
    else setLogoPreview(null);
  }, [logo]);

  useEffect(() => {
    if (favicon) setFaviconPreview(URL.createObjectURL(favicon));
    else setFaviconPreview(null);
  }, [favicon]);

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const sameHoursEveryDay =
    values.hours_same_everyday === "1" ||
    values.hours_same_everyday === 1 ||
    values.hours_same_everyday === true;
  const perDayHours = useMemo(
    () => splitHoursByDay((values.hours as string) ?? ""),
    [values.hours]
  );
  const everyDayHours = useMemo(() => {
    // The days can disagree without anyone meaning them to: the live value
    // holds "24hrs" on Monday and "24 hrs" on the other six. Proposing the
    // first day's value beats showing an empty box, which could be saved over
    // seven real ones without the editor noticing.
    const shared = commonHours(perDayHours);
    if (shared) return shared;
    return WEEK_DAYS.map((day) => perDayHours[day]).find(Boolean) ?? "";
  }, [perDayHours]);

  const handleFeatureChange = (index: number, key: string, value: string) => {
    const features = (Array.isArray(values.home_features) ? [...values.home_features] : Array(6).fill({ icon: "", title: "", description: "" })) as Record<string, string>[];
    features[index] = { ...features[index], [key]: value };
    handleChange("home_features", features);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    const allowedKeys = new Set(
      TABS.flatMap((tab) => tab.fields.map((f) => f.key)).filter(
        (k) => k !== "logo" && k !== "favicon"
      )
    );

    for (const key of allowedKeys) {
      const val = values[key];
      if (val === null || val === undefined) {
        fd.append(key, "");
        continue;
      }
      if (typeof val === "boolean") {
        fd.append(key, val ? "1" : "0");
      } else if (typeof val === "object") {
        fd.append(key, JSON.stringify(val));
      } else {
        fd.append(key, String(val));
      }
    }

    if (logo) fd.append("logo", logo);
    if (favicon) fd.append("favicon", favicon);

    try {
      const updated = await updateSettings(fd).unwrap();
      setValues((prev) => ({
        ...prev,
        ...updated,
        organization_description:
          (updated.organization_description as string) ||
          (updated.about as string) ||
          "",
        mission: (updated.mission as string) || "",
        vision: (updated.vision as string) || "",
        core_values:
          (updated.core_values as string) || (updated.values as string) || "",
        history: (updated.history as string) || "",
        awards_accreditations:
          (updated.awards_accreditations as string) ||
          (updated.awards as string) ||
          "",
      }));
      toast.success("Settings saved successfully");
      setLogo(null);
      setFavicon(null);
    } catch (err) {
      const apiErr = err as { data?: { message?: string }; error?: string };
      toast.error(
        apiErr?.data?.message ||
          (typeof apiErr?.error === "string" ? apiErr.error : null) ||
          (err instanceof Error ? err.message : null) ||
          "Save failed"
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--hb-accent)]" />
      </div>
    );
  }

  const currentLogo = logoPreview || resolveMediaUrl(data?.logo_url as string);
  const currentFavicon = faviconPreview || resolveMediaUrl(data?.favicon_url as string);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="hb-kicker">
            Configuration
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-tight text-slate-900 sm:text-3xl">
            Organization Settings
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Configure organization information, design themes, contact details, and platform behaviors.
          </p>
        </div>
        <Button
          type="button"
          onClick={(e) => handleSubmit(e)}
          disabled={saving}
          className="shrink-0 rounded-md h-11 px-6 shadow-md"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Tabs */}
        <div className="hb-panel sticky top-24 p-3">
          <nav className="flex flex-col space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-[var(--hb-accent-soft)] text-slate-900"
                      : "text-ink-muted hover:bg-stone/50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-slate-900" : "text-ink-muted/70")} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute right-0 h-6 w-1 rounded-l-full bg-[var(--hb-accent)]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="min-w-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {TABS.map((tab) => {
                if (activeTab !== tab.id) return null;
                return (
                  <motion.div
                    key={tab.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="hb-panel overflow-hidden"
                  >
                    <div className="border-b border-slate-200 bg-gradient-to-r from-[var(--hb-accent-soft)] to-white px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-emerald-300 shadow-sm">
                          <tab.icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-display text-xl font-bold text-slate-900">{tab.label}</h3>
                      </div>
                    </div>

                    {tab.id === "hours" ? (
                      <div className="space-y-6 p-6">
                        {/**
                         * Working hours used to be one single-line box holding
                         * the whole week as a run-on string — the saved value
                         * was "Monday: 24hrsTuesday: 24 hrs…" and there was no
                         * way to change one day without retyping all seven
                         * inside a field narrower than the text. The switch
                         * beside it promised per-day hours and did nothing.
                         *
                         * The switch now actually switches the editor, and the
                         * value is written back in the canonical per-day form
                         * whichever way it is edited, so the public side reads
                         * one shape and never a half-migrated one.
                         */}
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4.5">
                          <span className="font-semibold text-slate-900 text-sm sm:text-base">
                            Same hours every day
                          </span>
                          <Switch
                            checked={sameHoursEveryDay}
                            onCheckedChange={(checked) => {
                              handleChange("hours_same_everyday", checked ? "1" : "0");
                              // Re-serialise immediately, so whichever editor is
                              // on screen is the one that owns the saved value.
                              handleChange(
                                "hours",
                                checked
                                  ? buildHoursValue(everyDayHours)
                                  : buildHoursValue(perDayHours)
                              );
                            }}
                          />
                        </div>

                        {sameHoursEveryDay ? (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-900">
                              Hours, every day
                            </Label>
                            <Input
                              type="text"
                              value={everyDayHours}
                              onChange={(e) =>
                                handleChange("hours", buildHoursValue(e.target.value))
                              }
                              placeholder="24 hrs"
                              className="h-12 rounded-xl text-sm font-medium"
                            />
                            <p className="text-xs text-ink-muted">
                              Applied to all seven days. Examples:{" "}
                              <span className="font-medium">24 hrs</span>,{" "}
                              <span className="font-medium">08:00 – 17:00</span>.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-900">
                              Hours by day
                            </Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {WEEK_DAYS.map((day) => (
                                <div key={day} className="flex items-center gap-3">
                                  <span className="w-24 flex-none text-xs font-semibold uppercase tracking-wider text-ink-muted">
                                    {day}
                                  </span>
                                  <Input
                                    type="text"
                                    value={perDayHours[day] ?? ""}
                                    onChange={(e) =>
                                      handleChange(
                                        "hours",
                                        buildHoursValue({
                                          ...perDayHours,
                                          [day]: e.target.value,
                                        })
                                      )
                                    }
                                    placeholder="Closed"
                                    className="h-11 rounded-xl text-sm font-medium"
                                  />
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-ink-muted">
                              Leave a day blank to publish it as{" "}
                              <span className="font-medium">Closed</span>.
                            </p>
                          </div>
                        )}

                        {/* Visiting Hours Section */}
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Visiting Hours</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Shown separately from Working Hours — for family/friends visiting patients.
                            </p>
                          </div>

                          <Input
                            type="text"
                            value={(values.visiting_hours as string) ?? "Daily: 02:30 – 06:30 and 07:30 – 11:30 LT"}
                            onChange={(e) => handleChange("visiting_hours", e.target.value)}
                            placeholder="Daily: 02:30 – 06:30 and 07:30 – 11:30 LT"
                            className="h-12 rounded-xl text-sm font-medium"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-6 p-6 sm:grid-cols-2">
                      {tab.fields.map((field) => {
                        if (field.type === "features") {
                          const features = (Array.isArray(values[field.key]) ? values[field.key] : Array(6).fill({ icon: "", title: "", description: "" })) as Record<string, string>[];
                          return (
                            <div key={field.key} className="sm:col-span-2 space-y-4 rounded-md border border-slate-200 bg-stone/20 p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-5 w-5 text-[var(--hb-accent)]" />
                                <h4 className="font-semibold text-slate-900">Homepage Feature Cards</h4>
                              </div>
                              <p className="text-xs text-ink-muted -mt-2 mb-4">Edit the 6 feature cards shown on the public homepage. Do not hardcode content in templates.</p>
                              
                              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                  <div key={i} className="space-y-3 rounded-md bg-white p-4 shadow-sm border border-slate-100">
                                    <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--hb-accent)]">Card {i + 1}</h5>
                                    <div>
                                      <Label className="text-[10px]">Icon (Lucide Class/Name)</Label>
                                      <Input
                                        className="mt-1 h-8 text-xs rounded-lg"
                                        value={features[i]?.icon || ""}
                                        onChange={(e) => handleFeatureChange(i, "icon", e.target.value)}
                                        placeholder="e.g., HeartPulse"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px]">Title</Label>
                                      <Input
                                        className="mt-1 h-8 text-xs rounded-lg"
                                        value={features[i]?.title || ""}
                                        onChange={(e) => handleFeatureChange(i, "title", e.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px]">Description</Label>
                                      <Textarea
                                        className="mt-1 min-h-[60px] text-xs rounded-lg resize-none"
                                        value={features[i]?.description || ""}
                                        onChange={(e) => handleFeatureChange(i, "description", e.target.value)}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        if (field.type === "file") {
                          const isLogo = field.key === "logo";
                          const currentMedia = isLogo ? currentLogo : currentFavicon;
                          const setMedia = isLogo ? setLogo : setFavicon;

                          return (
                            <div key={field.key} className={cn("space-y-2", field.colSpan === 2 && "sm:col-span-2")}>
                              <Label>{field.label}</Label>
                              <div className="flex items-center gap-4">
                                {currentMedia ? (
                                  <div className="relative h-16 w-16 overflow-hidden rounded-md bg-stone/40 ring-1 ring-slate-200">
                                    <Image src={currentMedia} alt={field.label} fill sizes="160px" className="object-contain p-2" unoptimized />
                                  </div>
                                ) : (
                                  <div className="flex h-16 w-16 flex-col items-center justify-center rounded-md bg-stone/40 text-ink-muted/50 ring-1 ring-slate-200">
                                    <ImageIcon className="h-5 w-5 mb-1" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setMedia(e.target.files?.[0] ?? null)}
                                    className="rounded-md cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (field.type === "richtext") {
                          return (
                            <div
                              key={field.key}
                              className={cn("space-y-2", field.colSpan === 2 && "sm:col-span-2")}
                            >
                              <Label>{field.label}</Label>
                              {field.hint && (
                                <p className="text-xs text-ink-muted">{field.hint}</p>
                              )}
                              <RichTextEditor
                                id={`settings-${field.key}`}
                                value={(values[field.key] as string) || ""}
                                onChange={(html) => handleChange(field.key, html)}
                                placeholder={field.placeholder}
                                minHeight={field.minHeight || "200px"}
                              />
                            </div>
                          );
                        }

                        if (field.type === "switch") {
                          const val = values[field.key];
                          const isChecked = val === 1 || val === true || val === "1";
                          return (
                            <div key={field.key} className={cn("flex items-center justify-between rounded-md border border-slate-100 bg-stone/20 p-4", field.colSpan === 2 && "sm:col-span-2")}>
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{field.label}</Label>
                              </div>
                              <Switch
                                checked={isChecked}
                                onCheckedChange={(c) => handleChange(field.key, c ? "1" : "0")}
                              />
                            </div>
                          );
                        }

                        if (field.type === "color") {
                          return (
                            <div key={field.key} className="space-y-2">
                              <Label>{field.label}</Label>
                              <div className="flex items-center gap-2">
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 shadow-sm cursor-pointer hover:scale-105 transition-transform">
                                  <input
                                    type="color"
                                    value={(values[field.key] as string) || "#ffffff"}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    className="absolute -inset-2 h-14 w-14 cursor-pointer opacity-0"
                                  />
                                  <div className="h-full w-full pointer-events-none" style={{ backgroundColor: (values[field.key] as string) || "#ffffff" }} />
                                </div>
                                <Input
                                  type="text"
                                  value={(values[field.key] as string) || ""}
                                  onChange={(e) => handleChange(field.key, e.target.value)}
                                  className="rounded-md font-mono text-xs uppercase"
                                  placeholder="#000000"
                                />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={field.key} className={cn("space-y-2", field.colSpan === 2 && "sm:col-span-2")}>
                            <Label>{field.label}</Label>
                            {field.hint && (
                              <p className="text-xs text-ink-muted">{field.hint}</p>
                            )}
                            {field.type === "textarea" ? (
                              <Textarea
                                value={(values[field.key] as string) || ""}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                className="rounded-md min-h-[100px]"
                                placeholder={field.placeholder}
                              />
                            ) : (
                              <Input
                                type={field.type}
                                value={(values[field.key] as string) || ""}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                className="rounded-md"
                                placeholder={field.placeholder}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </form>
        </div>
      </div>
    </div>
  );
}
