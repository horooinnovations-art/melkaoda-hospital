export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order?: number;
  is_active?: boolean;
}

export const SAMPLE_NEWS_CATEGORIES: CategoryItem[] = [
  {
    id: 1,
    name: "Hospital News",
    slug: "hospital-news",
    description: "Official hospital updates, announcements, and general news.",
    icon: "fas-newspaper",
    order: 1,
    is_active: true,
  },
  {
    id: 2,
    name: "Clinical & Medical Updates",
    slug: "clinical-updates",
    description: "Medical breakthroughs, clinical protocols, and treatment advances.",
    icon: "fas-stethoscope",
    order: 2,
    is_active: true,
  },
  {
    id: 3,
    name: "Community Health Outreach",
    slug: "community-health",
    description: "Public health initiatives, mobile clinics, and community wellness.",
    icon: "fas-users",
    order: 3,
    is_active: true,
  },
  {
    id: 4,
    name: "Events & Ceremonies",
    slug: "events-ceremonies",
    description: "Hospital events, conferences, and ceremonial gatherings.",
    icon: "fas-calendar-alt",
    order: 4,
    is_active: true,
  },
  {
    id: 5,
    name: "Press Releases & Media",
    slug: "press-releases",
    description: "Official statements for press, media outlets, and partners.",
    icon: "fas-bullhorn",
    order: 5,
    is_active: true,
  },
  {
    id: 6,
    name: "Awards & Achievements",
    slug: "awards-achievements",
    description: "Recognition, awards, and milestones achieved by Gambo Hospital.",
    icon: "fas-award",
    order: 6,
    is_active: true,
  },
];

export const SAMPLE_GALLERY_CATEGORIES: CategoryItem[] = [
  {
    id: 1,
    name: "Campus & Facilities",
    slug: "campus-facilities",
    description: "Photos of hospital buildings, campus grounds, gate, and architecture.",
    icon: "fas-building",
    order: 1,
    is_active: true,
  },
  {
    id: 2,
    name: "Medical Staff & Doctors",
    slug: "medical-staff",
    description: "Physicians, nurses, specialists, and administrative personnel.",
    icon: "fas-user-md",
    order: 2,
    is_active: true,
  },
  {
    id: 3,
    name: "Operating Theatres & Surgeries",
    slug: "operating-theatres",
    description: "Surgical suites, medical procedures, and emergency operations.",
    icon: "fas-heartbeat",
    order: 3,
    is_active: true,
  },
  {
    id: 4,
    name: "Community Healthcare Outreach",
    slug: "community-outreach",
    description: "Field visits, rural health centers, and community vaccinations.",
    icon: "fas-hands-helping",
    order: 4,
    is_active: true,
  },
  {
    id: 5,
    name: "Patient Care & Wards",
    slug: "patient-care",
    description: "Inpatient wards, recovery units, pediatric care, and clinics.",
    icon: "fas-procedures",
    order: 5,
    is_active: true,
  },
  {
    id: 6,
    name: "Events & Celebrations",
    slug: "events-celebrations",
    description: "Ceremonies, inaugurations, staff gatherings, and milestone events.",
    icon: "fas-star",
    order: 6,
    is_active: true,
  },
];

// Helper functions for Local Storage persistence

export function getStoredNewsCategories(): CategoryItem[] {
  if (typeof window === "undefined") return SAMPLE_NEWS_CATEGORIES;
  try {
    const saved = localStorage.getItem("gambo_news_categories");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return SAMPLE_NEWS_CATEGORIES;
}

export function saveStoredNewsCategories(items: CategoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("gambo_news_categories", JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function getStoredGalleryCategories(): CategoryItem[] {
  if (typeof window === "undefined") return SAMPLE_GALLERY_CATEGORIES;
  try {
    const saved = localStorage.getItem("gambo_gallery_categories");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return SAMPLE_GALLERY_CATEGORIES;
}

export function saveStoredGalleryCategories(items: CategoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("gambo_gallery_categories", JSON.stringify(items));
  } catch {
    /* ignore */
  }
}
