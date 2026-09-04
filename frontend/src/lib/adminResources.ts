import type { ReactNode } from "react";
import type { AdminResource } from "@/store/adminApi";

export type FieldType =
  | "text"
  | "url"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "datetime"
  | "time"
  | "textarea"
  | "richtext"
  | "select"
  | "multiselect"
  | "switch"
  | "hidden"
  | "readonly"
  | "file";

export interface FieldOption {
  label: string;
  value: string;
}

export interface AdminField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  optionsUrl?: string;
  rows?: number;
  hint?: string;
  colSpan?: 1 | 2;
  valueFormat?: "jsonArray";
  /** Initial value used when creating a new record. */
  defaultValue?: boolean | string | number;
}

export interface AdminColumn {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
}

export interface AdminResourceConfig {
  resource: AdminResource;
  title: string;
  description?: string;
  fileField?: string;
  titleField?: string;
  columns: AdminColumn[];
  fields: AdminField[];
  disableDelete?: boolean;
  hasActiveToggle?: boolean;
  activeField?: string;
  activeValue?: string | number | boolean;
  inactiveValue?: string | number | boolean;
}

function statusOptions() {
  return [
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Archived", value: "archived" },
  ];
}

function titleOptions() {
  return [
    { label: "Dr.", value: "Dr." },
    { label: "Prof.", value: "Prof." },
    { label: "Prof. Dr.", value: "Prof. Dr." },
  ];
}

function yesSwitch(name: string, label: string) {
  return { name, label, type: "switch" as const, defaultValue: true };
}

function seoFields() {
  return [
    { name: "meta_title", label: "SEO Meta Title", type: "text" as const },
    {
      name: "meta_description",
      label: "SEO Meta Description",
      type: "textarea" as const,
      rows: 3,
    },
  ];
}

function activeSwitch(name = "is_active", label = "Active") {
  return { name, label, type: "switch" as const, defaultValue: true };
}

function orderField() {
  return {
    name: "order",
    label: "Display Order",
    type: "number" as const,
    placeholder: "0",
    defaultValue: 0,
  };
}

function slugField() {
  return {
    name: "slug",
    label: "Slug",
    type: "text" as const,
    placeholder: "auto-generated if empty",
  };
}

function hiddenField(name: string) {
  return { name, label: name, type: "hidden" as const };
}

export const ADMIN_RESOURCE_CONFIGS: Record<AdminResource, AdminResourceConfig> = {
  departments: {
    resource: "departments",
    title: "Departments",
    description: "Manage hospital departments and clinical units.",
    fileField: "featured_image",
    titleField: "name",
    columns: [
      { key: "id", label: "Department ID" },
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "order", label: "Order" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      {
        name: "id",
        label: "Department ID",
        type: "readonly",
        hint: "Auto-generated after the department is saved.",
      },
      {
        name: "category_id",
        label: "Department Category",
        type: "select",
        optionsUrl: "/admin/department-category-options",
        hint: "Select the category for this department.",
      },
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "short_description", label: "Short Description", type: "textarea", rows: 2 },
      { name: "description", label: "Full Description", type: "richtext", rows: 5, colSpan: 2 },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "email", label: "Email", type: "email" },
      { name: "location", label: "Location", type: "text" },
      {
        name: "head_doctor_id",
        label: "Head Doctor",
        type: "select",
        optionsUrl: "/admin/doctor-options",
      },
      {
        name: "icon",
        label: "Icon Class",
        type: "text",
        placeholder: "fas fa-heartbeat",
        defaultValue: "fas fa-heartbeat",
        hint: "Font Awesome class name, e.g. fa-heart-pulse.",
      },
      { name: "featured_image", label: "Featured Image", type: "file" },
      hiddenField("featured_image_id"),
      orderField(),
      ...seoFields(),
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  "department-categories": {
    resource: "department-categories",
    title: "Department Categories",
    description: "Group departments into categories.",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "order", label: "Order" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "description", label: "Description", type: "textarea", rows: 3 },
      {
        name: "icon",
        label: "Icon Class",
        type: "text",
        placeholder: "fas fa-stethoscope",
      },
      orderField(),
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  doctors: {
    resource: "doctors",
    title: "Doctors",
    description: "Manage physician profiles and availability.",
    fileField: "photo",
    titleField: "last_name",
    columns: [
      { key: "first_name", label: "First Name" },
      { key: "last_name", label: "Last Name" },
      { key: "designation", label: "Designation" },
      { key: "department_id", label: "Department ID" },
      { key: "email", label: "Email" },
      { key: "order", label: "Order" },
      { key: "is_available", label: "Available" },
    ],
    fields: [
      {
        name: "title",
        label: "Title",
        type: "select",
        options: titleOptions(),
      },
      { name: "first_name", label: "First Name", type: "text", required: true },
      { name: "last_name", label: "Last Name", type: "text", required: true },
      slugField(),
      {
        name: "department_id",
        label: "Department ID",
        type: "number",
        required: true,
        hint: "Enter the integer ID of the department for this doctor.",
      },
      {
        name: "category_id",
        label: "Department Category",
        type: "select",
        optionsUrl: "/admin/department-category-options",
      },
      { name: "short_bio", label: "Short Bio", type: "textarea", rows: 3, colSpan: 2 },
      { name: "bio", label: "Full Biography", type: "richtext", rows: 5, colSpan: 2 },
      { name: "designation", label: "Designation", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "experience_years", label: "Years of Experience", type: "number" },
      { name: "consultation_fee", label: "Consultation Fee", type: "number" },
      { name: "photo", label: "Photo", type: "file" },
      hiddenField("photo_id"),
      {
        name: "specializations",
        label: "Specializations",
        type: "multiselect",
        optionsUrl: "/admin/specialization-options",
        colSpan: 2,
      },
      {
        name: "education",
        label: "Education",
        type: "textarea",
        rows: 4,
        colSpan: 2,
        hint: "One degree or qualification per line.",
      },
      {
        name: "certifications",
        label: "Certifications",
        type: "textarea",
        rows: 4,
        colSpan: 2,
        hint: "One certification per line.",
      },
      {
        name: "languages",
        label: "Languages",
        type: "text",
        placeholder: "Afaan Oromoo, Amharic, English",
        hint: "Comma-separated.",
      },
      { name: "availability_monday", label: "Monday Availability", type: "text", placeholder: "09:00-17:00" },
      { name: "availability_tuesday", label: "Tuesday Availability", type: "text", placeholder: "09:00-17:00" },
      { name: "availability_wednesday", label: "Wednesday Availability", type: "text", placeholder: "09:00-17:00" },
      { name: "availability_thursday", label: "Thursday Availability", type: "text", placeholder: "09:00-17:00" },
      { name: "availability_friday", label: "Friday Availability", type: "text", placeholder: "09:00-17:00" },
      { name: "availability_saturday", label: "Saturday Availability", type: "text", placeholder: "09:00-13:00" },
      { name: "availability_sunday", label: "Sunday Availability", type: "text", placeholder: "Closed" },
      hiddenField("availability_schedule"),
      orderField(),
      ...seoFields(),
      yesSwitch("is_available", "Available"),
      { name: "is_featured", label: "Featured", type: "switch" },
    ],
    disableDelete: true,
    hasActiveToggle: true,
    activeField: "is_available",
  },
  services: {
    resource: "services",
    title: "Services",
    description: "Hospital services and procedures.",
    fileField: "featured_image",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "order", label: "Order" },
      { key: "is_available", label: "Available" },
    ],
    fields: [
      {
        name: "department_id",
        label: "Department",
        type: "select",
        required: true,
        optionsUrl: "/admin/department-options",
      },
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "short_description", label: "Short Description", type: "textarea", rows: 2 },
      { name: "description", label: "Description", type: "richtext", rows: 5, colSpan: 2 },
      { name: "price", label: "Price", type: "number" },
      {
        name: "duration",
        label: "Duration",
        type: "number",
        hint: "Duration in minutes.",
      },
      { name: "featured_image", label: "Featured Image", type: "file" },
      orderField(),
      ...seoFields(),
      yesSwitch("requires_appointment", "Requires Appointment"),
      yesSwitch("is_available", "Available"),
    ],
    disableDelete: true,
    hasActiveToggle: true,
    activeField: "is_available",
  },
  specializations: {
    resource: "specializations",
    title: "Specializations",
    description: "Medical specializations and focus areas.",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "description", label: "Description", type: "richtext", rows: 3 },
      { name: "icon", label: "Icon Class", type: "text", hint: "e.g., fa-heart" },
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  leadership: {
    resource: "leadership",
    title: "Leadership",
    description: "Current hospital leadership team.",
    fileField: "photo",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "position", label: "Position" },
      { key: "order", label: "Order" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "position", label: "Position", type: "text", required: true },
      slugField(),
      {
        name: "short_bio",
        label: "Short bio",
        type: "textarea",
        rows: 3,
        colSpan: 2,
        hint: "Shown on the about page (max 500 characters).",
      },
      {
        name: "bio",
        label: "Full biography",
        type: "richtext",
        rows: 5,
        colSpan: 2,
        hint: "Use headings, lists, and links for a polished public bio.",
      },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "linkedin_url", label: "LinkedIn URL", type: "url", placeholder: "https://linkedin.com/in/..." },
      { name: "twitter_url", label: "Twitter / X URL", type: "url", placeholder: "https://twitter.com/..." },
      { name: "experience_years", label: "Years of experience", type: "number" },
      {
        name: "order",
        label: "Display order",
        type: "number",
        placeholder: "0",
        defaultValue: 0,
        hint: "Lower numbers appear first.",
      },
      {
        name: "education",
        label: "Education (JSON array)",
        type: "textarea",
        rows: 3,
        colSpan: 2,
        placeholder: '["MD, Addis Ababa University"]',
        valueFormat: "jsonArray",
      },
      {
        name: "certifications",
        label: "Certifications (JSON array)",
        type: "textarea",
        rows: 3,
        colSpan: 2,
        placeholder: '["Board Certified"]',
        valueFormat: "jsonArray",
      },
      { name: "photo", label: "Upload image", type: "file", hint: "Square 400x400px recommended." },
      { name: "is_featured", label: "Featured leader", type: "switch" },
      activeSwitch("is_active", "Active on public site"),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  "leadership-history": {
    resource: "leadership-history",
    title: "Leadership History",
    description: "Former leaders in chronological order.",
    fileField: "photo",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "position", label: "Position" },
      { key: "tenure_start", label: "Tenure Start" },
      { key: "tenure_end", label: "Tenure End" },
      { key: "order", label: "Order" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "position", label: "Position", type: "text", required: true },
      slugField(),
      { name: "short_bio", label: "Short Bio", type: "textarea", rows: 2 },
      { name: "bio", label: "Bio", type: "richtext", rows: 5, colSpan: 2 },
      { name: "photo", label: "Photo", type: "file" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "tenure_start", label: "Tenure Start", type: "date" },
      { name: "tenure_end", label: "Tenure End", type: "date" },
      {
        name: "achievements",
        label: "Achievements",
        type: "textarea",
        rows: 4,
        colSpan: 2,
        hint: "One achievement per line",
      },
      { name: "education", label: "Education", type: "textarea", rows: 3, colSpan: 2 },
      orderField(),
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  news: {
    resource: "news",
    title: "News",
    description: "Hospital news and press releases.",
    fileField: "featured_image",
    titleField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "published_at", label: "Published" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      slugField(),
      {
        name: "category_id",
        label: "Category",
        type: "select",
        optionsUrl: "/admin/category-options",
        options: [
          { label: "Hospital News", value: "Hospital News" },
          { label: "Clinical & Medical Updates", value: "Clinical & Medical Updates" },
          { label: "Community Health Outreach", value: "Community Health Outreach" },
          { label: "Events & Ceremonies", value: "Events & Ceremonies" },
          { label: "Press Releases & Media", value: "Press Releases & Media" },
          { label: "Awards & Achievements", value: "Awards & Achievements" },
        ],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        defaultValue: "draft",
        options: statusOptions(),
      },
      { name: "excerpt", label: "Excerpt", type: "textarea", rows: 2 },
      { name: "content", label: "Content", type: "richtext", rows: 8, required: true, colSpan: 2 },
      { name: "featured_image", label: "Featured Image", type: "file" },
      { name: "published_at", label: "Publish Date", type: "datetime" },
      { name: "is_featured", label: "Featured", type: "switch" },
      ...seoFields(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
    activeField: "status",
    activeValue: "published",
    inactiveValue: "draft",
  },
  "news-categories": {
    resource: "news-categories",
    title: "News Categories",
    description: "Manage categories for hospital news articles and press releases.",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "order", label: "Order" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "description", label: "Description", type: "textarea", rows: 3 },
      {
        name: "icon",
        label: "Icon Class",
        type: "text",
        placeholder: "fas fa-newspaper",
      },
      orderField(),
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  announcements: {
    resource: "announcements",
    title: "Announcements",
    description: "Public announcements and notices.",
    fileField: "featured_image",
    titleField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "is_pinned", label: "Pinned" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      slugField(),
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        defaultValue: "announcement",
        options: [
          { label: "Announcement", value: "announcement" },
          { label: "Notice", value: "notice" },
          { label: "Alert", value: "alert" },
        ],
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        required: true,
        defaultValue: "normal",
        options: [
          { label: "Low", value: "low" },
          { label: "Normal", value: "normal" },
          { label: "High", value: "high" },
          { label: "Urgent", value: "urgent" },
        ],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        defaultValue: "draft",
        options: statusOptions(),
      },
      { name: "published_at", label: "Published Date", type: "datetime" },
      { name: "expires_at", label: "Expires At", type: "datetime" },
      { name: "excerpt", label: "Excerpt", type: "textarea", rows: 2 },
      { name: "content", label: "Content", type: "richtext", rows: 8, required: true, colSpan: 2 },
      { name: "featured_image", label: "Featured Image", type: "file" },
      { name: "is_pinned", label: "Pinned", type: "switch" },
    ],
    disableDelete: true,
    hasActiveToggle: true,
    activeField: "status",
    activeValue: "published",
    inactiveValue: "draft",
  },
  gallery: {
    resource: "gallery",
    title: "Gallery",
    description: "Photo and media gallery items. Use the eye icon to hide an image from the public site.",
    fileField: "media_file",
    titleField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "is_active", label: "Visible" },
      { key: "order", label: "Order" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      slugField(),
      {
        name: "type",
        label: "Media Type",
        type: "select",
        required: true,
        defaultValue: "image",
        options: [
          { label: "Image", value: "image" },
          { label: "Video", value: "video" },
        ],
      },
      {
        name: "category_id",
        label: "Category",
        type: "select",
        optionsUrl: "/admin/category-options",
        options: [
          { label: "Campus & Facilities", value: "Campus & Facilities" },
          { label: "Medical Staff & Doctors", value: "Medical Staff & Doctors" },
          { label: "Operating Theatres & Surgeries", value: "Operating Theatres & Surgeries" },
          { label: "Community Healthcare Outreach", value: "Community Healthcare Outreach" },
          { label: "Patient Care & Wards", value: "Patient Care & Wards" },
          { label: "Events & Celebrations", value: "Events & Celebrations" },
        ],
      },
      { name: "description", label: "Description", type: "textarea", rows: 4, colSpan: 2 },
      { name: "media_file", label: "Upload Media File", type: "file", required: true },
      orderField(),
      { name: "is_featured", label: "Featured", type: "switch" },
    ],
    disableDelete: true,
    hasActiveToggle: false,
  },
  "gallery-categories": {
    resource: "gallery-categories",
    title: "Gallery Categories",
    description: "Manage categories for photos and media gallery items.",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "order", label: "Order" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "description", label: "Description", type: "textarea", rows: 3 },
      {
        name: "icon",
        label: "Icon Class",
        type: "text",
        placeholder: "fas fa-images",
      },
      orderField(),
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  pages: {
    resource: "pages",
    title: "Pages",
    description: "CMS pages and static content.",
    titleField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      slugField(),
      { name: "excerpt", label: "Excerpt", type: "textarea", rows: 2 },
      { name: "content", label: "Content", type: "richtext", rows: 10, colSpan: 2 },
      { name: "status", label: "Status", type: "select", defaultValue: "draft", options: statusOptions() },
      { name: "is_homepage", label: "Homepage", type: "switch" },
      ...seoFields(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
    activeField: "status",
    activeValue: "published",
    inactiveValue: "draft",
  },
  events: {
    resource: "events",
    title: "Events",
    description: "Hospital events and community programs.",
    fileField: "featured_image",
    titleField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "event_date", label: "Date" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      slugField(),
      { name: "description", label: "Event Description", type: "richtext", rows: 5, required: true, colSpan: 2 },
      { name: "event_date", label: "Event Date", type: "date", required: true },
      { name: "event_time", label: "Event Time", type: "time" },
      { name: "end_date", label: "End Date", type: "date" },
      { name: "end_time", label: "End Time", type: "time" },
      { name: "venue", label: "Venue", type: "text" },
      { name: "location", label: "Location", type: "text" },
      { name: "registration_required", label: "Registration Required", type: "switch" },
      { name: "max_attendees", label: "Max Attendees", type: "number" },
      { name: "registration_deadline", label: "Registration Deadline", type: "date" },
      { name: "featured_image", label: "Featured Image", type: "file" },
    ],
    disableDelete: true,
    hasActiveToggle: true,
    activeField: "status",
    activeValue: "upcoming",
    inactiveValue: "cancelled",
  },
  careers: {
    resource: "careers",
    title: "Careers",
    description: "Job openings and career opportunities.",
    fileField: "file",
    titleField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "department", label: "Department" },
      { key: "employment_type", label: "Type" },
      { key: "location", label: "Location" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      slugField(),
      { name: "department", label: "Department", type: "text" },
      { name: "location", label: "Location", type: "text" },
      {
        name: "employment_type",
        label: "Employment Type",
        type: "select",
        required: true,
        defaultValue: "full_time",
        options: [
          { label: "Full Time", value: "full_time" },
          { label: "Part Time", value: "part_time" },
          { label: "Contract", value: "contract" },
          { label: "Internship", value: "internship" },
        ],
      },
      {
        name: "experience_level",
        label: "Experience Level",
        type: "select",
        required: true,
        defaultValue: "entry",
        options: [
          { label: "Entry Level", value: "entry" },
          { label: "Mid Level", value: "mid" },
          { label: "Senior Level", value: "senior" },
          { label: "Executive", value: "executive" },
        ],
      },
      { name: "salary_range", label: "Salary Range", type: "text" },
      { name: "application_deadline", label: "Application Deadline", type: "date" },
      { name: "description", label: "Description", type: "richtext", rows: 5, required: true, colSpan: 2 },
      { name: "requirements", label: "Requirements", type: "richtext", rows: 5, colSpan: 2 },
      { name: "responsibilities", label: "Responsibilities", type: "richtext", rows: 5, colSpan: 2 },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        defaultValue: "open",
        options: [
          { label: "Open", value: "open" },
          { label: "Closed", value: "closed" },
          { label: "On Hold", value: "on_hold" },
        ],
      },
    ],
    disableDelete: true,
    hasActiveToggle: true,
    activeField: "status",
    activeValue: "open",
    inactiveValue: "closed",
  },
  testimonials: {
    resource: "testimonials",
    title: "Testimonials",
    description: "Patient testimonials and reviews.",
    fileField: "patient_photo",
    titleField: "patient_name",
    columns: [
      { key: "patient_name", label: "Patient" },
      { key: "rating", label: "Rating" },
      { key: "is_approved", label: "Approved" },
    ],
    fields: [
      { name: "patient_name", label: "Patient Name", type: "text", required: true },
      {
        name: "rating",
        label: "Rating",
        type: "select",
        required: true,
        defaultValue: 5,
        options: [
          { label: "5 Stars", value: "5" },
          { label: "4 Stars", value: "4" },
          { label: "3 Stars", value: "3" },
          { label: "2 Stars", value: "2" },
          { label: "1 Star", value: "1" },
        ],
      },
      { name: "content", label: "Content", type: "textarea", rows: 6, required: true, colSpan: 2 },
      {
        name: "department_id",
        label: "Department",
        type: "select",
        optionsUrl: "/admin/department-options",
      },
      {
        name: "doctor_id",
        label: "Doctor",
        type: "select",
        optionsUrl: "/admin/doctor-options",
      },
      { name: "patient_photo", label: "Patient Photo", type: "file" },
      orderField(),
      { name: "is_approved", label: "Approved", type: "switch" },
      { name: "is_featured", label: "Featured", type: "switch" },
    ],
    disableDelete: true,
    hasActiveToggle: true,
    activeField: "is_approved",
  },
  faqs: {
    resource: "faqs",
    title: "FAQs",
    description: "Frequently asked questions.",
    titleField: "question",
    columns: [
      { key: "question", label: "Question" },
      { key: "category", label: "Category" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "question", label: "Question", type: "text", required: true, colSpan: 2 },
      { name: "answer", label: "Answer", type: "richtext", rows: 4, required: true, colSpan: 2 },
      { name: "category", label: "Category", type: "text" },
      orderField(),
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  downloads: {
    resource: "downloads",
    title: "Downloads",
    description:
      "Forms, guides and resources listed on the public Downloads page. Upload a file or point an entry at a file hosted elsewhere.",
    fileField: "file",
    titleField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "file_type", label: "Type" },
      {
        key: "download_count",
        label: "Downloads",
        // formatCellValue turns 0/1 into No/Yes, which is wrong for a counter.
        render: (row) => String(Number(row.download_count ?? 0)),
      },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      {
        name: "id",
        label: "Download ID",
        type: "readonly",
        hint: "Auto-generated after the entry is saved.",
      },
      { name: "title", label: "Title", type: "text", required: true },
      slugField(),
      {
        name: "category",
        label: "Category",
        type: "text",
        placeholder: "Patient Forms",
        hint: "Groups the entry on the public page. Reuse an existing name (e.g. Patient Forms, Guides & Manuals, Partner Resources) or type a new one.",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        rows: 3,
        colSpan: 2,
        hint: "One or two lines telling visitors what the file is for.",
      },
      {
        name: "file",
        label: "File",
        type: "file",
        colSpan: 2,
        hint: "PDF, Word, Excel, CSV, text or image — up to 8 MB. Leave empty and fill in the URL below to link a file hosted elsewhere.",
      },
      hiddenField("file_id"),
      {
        name: "file_url",
        label: "External File URL",
        type: "url",
        colSpan: 2,
        placeholder: "https://…",
        hint: "Only needed when you are not uploading a file. An upload overwrites this.",
      },
      {
        name: "version",
        label: "Version / Revision",
        type: "text",
        placeholder: "v1.0",
      },
      { name: "published_at", label: "Publish Date", type: "date" },
      orderField(),
      ...seoFields(),
      { name: "is_featured", label: "Featured", type: "switch" },
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  "partnership-categories": {
    resource: "partnership-categories",
    title: "Partnership Categories",
    description: "Manage categories for partnership listings.",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "order", label: "Order" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "description", label: "Description", type: "textarea", rows: 2 },
      orderField(),
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  insurance: {
    resource: "insurance",
    title: "Insurance",
    description: "Accepted insurance providers.",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "contact_phone", label: "Phone" },
      { key: "website", label: "Website" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "description", label: "Description", type: "textarea", rows: 5, colSpan: 2 },
      { name: "logo_id", label: "Logo Media ID", type: "number" },
      { name: "website", label: "Website URL", type: "url", placeholder: "https://www.insurance.com" },
      { name: "contact_phone", label: "Phone", type: "phone" },
      { name: "contact_email", label: "Email", type: "email" },
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  partnerships: {
    resource: "partnerships",
    title: "Partnerships",
    description: "Institutional, government, NGO, and community partners.",
    fileField: "logo",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "website", label: "Website" },
      { key: "order", label: "Order" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      {
        name: "category",
        label: "Category",
        type: "select",
        required: true,
        optionsUrl: "/admin/partnership-category-options",
      },
      { name: "website", label: "Website URL", type: "text", placeholder: "https://..." },
      {
        name: "description",
        label: "Description",
        type: "richtext",
        rows: 5,
        colSpan: 2,
        placeholder: "Write content...",
      },
      { name: "logo", label: "Logo", type: "file", hint: "Images, PDF, or Word documents" },
      orderField(),
      activeSwitch("is_active", "Active"),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  "emergency-services": {
    resource: "emergency-services",
    title: "Emergency Services",
    description: "Emergency care services and protocols.",
    fileField: "featured_image",
    titleField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "phone", label: "Phone" },
      { key: "is_active", label: "Active" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      slugField(),
      { name: "short_description", label: "Short Description", type: "textarea", rows: 2 },
      { name: "description", label: "Full Description", type: "richtext", rows: 5, required: true, colSpan: 2 },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "email", label: "Email", type: "email" },
      { name: "location", label: "Location", type: "text" },
      { name: "available_from", label: "Available From", type: "time" },
      { name: "available_to", label: "Available To", type: "time" },
      {
        name: "services_offered",
        label: "Services Offered",
        type: "textarea",
        rows: 5,
        colSpan: 2,
        hint: "One service per line.",
      },
      {
        name: "procedures",
        label: "Procedures",
        type: "textarea",
        rows: 5,
        colSpan: 2,
        hint: "One procedure per line.",
      },
      { name: "featured_image", label: "Featured Image", type: "file" },
      orderField(),
      { name: "is_24_hours", label: "Available 24/7", type: "switch" },
      { name: "is_featured", label: "Featured", type: "switch" },
      activeSwitch(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
  },
  "health-education": {
    resource: "health-education",
    title: "Health Education",
    description: "Patient education articles and resources.",
    fileField: "featured_image",
    titleField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      slugField(),
      { name: "category", label: "Category", type: "text" },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        defaultValue: "draft",
        options: statusOptions(),
      },
      {
        name: "tags",
        label: "Tags",
        type: "text",
        placeholder: "nutrition, wellness, prevention",
        hint: "Comma-separated.",
      },
      { name: "excerpt", label: "Excerpt", type: "textarea", rows: 2 },
      { name: "content", label: "Content", type: "richtext", rows: 8, required: true, colSpan: 2 },
      { name: "featured_image", label: "Featured Image", type: "file" },
      { name: "published_at", label: "Publish Date", type: "datetime" },
      { name: "is_featured", label: "Featured", type: "switch" },
      ...seoFields(),
    ],
    disableDelete: true,
    hasActiveToggle: true,
    activeField: "status",
    activeValue: "published",
    inactiveValue: "draft",
  },
  roles: {
    resource: "roles",
    title: "Roles",
    description: "User roles and access levels.",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "description", label: "Description", type: "richtext", rows: 3 },
    ],
    disableDelete: true,
  },
  permissions: {
    resource: "permissions",
    title: "Permissions",
    description: "Granular permission definitions.",
    titleField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "module", label: "Module" },
      { key: "slug", label: "Slug" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "module", label: "Module", type: "text" },
      { name: "description", label: "Description", type: "richtext", rows: 3 },
    ],
    disableDelete: true,
  }
};

export function getResourceConfig(resource: AdminResource): AdminResourceConfig {
  return ADMIN_RESOURCE_CONFIGS[resource];
}

export function buildFormData(
  fields: AdminField[],
  values: Record<string, unknown>,
  fileField?: string
): FormData {
  const fd = new FormData();
  for (const field of fields) {
    const val = values[field.name];
    if (field.type === "readonly") continue;
    if (field.type === "file") {
      if (val instanceof File) {
        fd.append(field.name, val);
      }
      continue;
    }
    if (field.type === "switch") {
      fd.append(field.name, val ? "1" : "0");
      continue;
    }
    if (field.type === "multiselect") {
      const arr = Array.isArray(val) ? val : val ? [val] : [];
      if (arr.length === 0) {
        fd.append(field.name, "");
      } else {
        arr.forEach((item) => fd.append(field.name, String(item)));
      }
      continue;
    }
    if (val === undefined || val === null || val === "") continue;
    fd.append(field.name, String(val));
  }
  if (fileField && values[fileField] instanceof File) {
    fd.set(fileField, values[fileField] as File);
  }
  return fd;
}

export function rowToFormValues(
  row: Record<string, unknown>,
  fields: AdminField[]
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const val = row[field.name];
    if (field.type === "switch") {
      values[field.name] = val === 1 || val === true || val === "1";
    } else if (field.type === "multiselect") {
      const arr = Array.isArray(val)
        ? val
        : Array.isArray(row[`${field.name}_ids`])
          ? (row[`${field.name}_ids`] as unknown[])
          : [];
      values[field.name] = arr.map((item) =>
        typeof item === "object" && item !== null && "id" in item
          ? String((item as { id: unknown }).id)
          : String(item)
      );
    } else if (field.name.startsWith("availability_") && !val) {
      const day = field.name.replace("availability_", "");
      const schedule = row.availability_schedule as Record<string, unknown> | undefined;
      values[field.name] = schedule?.[day] ?? "";
    } else if (
      ["education", "certifications", "achievements", "services_offered", "procedures"].includes(field.name) &&
      Array.isArray(val)
    ) {
      values[field.name] = field.valueFormat === "jsonArray" ? JSON.stringify(val) : val.join("\n");
    } else if (["languages", "tags"].includes(field.name) && Array.isArray(val)) {
      values[field.name] = val.join(", ");
    } else if (field.type === "date" && val) {
      values[field.name] = String(val).slice(0, 10);
    } else if (field.type === "datetime" && val) {
      values[field.name] = String(val).replace(" ", "T").slice(0, 16);
    } else if (field.type === "time" && val) {
      values[field.name] = String(val).slice(0, 5);
    } else if (val !== undefined && val !== null) {
      values[field.name] = val;
    } else {
      values[field.name] = "";
    }
  }
  return values;
}

export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === 1 || value === "1") return "Yes";
  if (value === 0 || value === "0") return "No";
  if (typeof value === "string" && value.length > 80) return `${value.slice(0, 80)}…`;
  return String(value);
}
