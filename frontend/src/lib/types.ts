export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  perPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface MediaRef {
  id: number;
  url: string;
  alt_text?: string | null;
  path?: string;
}

export interface SiteSettings {
  site_name?: string;
  tagline?: string;
  mission?: string;
  vision?: string;
  values?: string | string[];
  history?: string;
  awards?: string;
  about?: string;
  phone?: string;
  emergency_phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  visiting_hours?: string;
  hours_same_everyday?: boolean | number;
  logo_url?: string;
  google_maps_url?: string;
  latitude?: string | number;
  longitude?: string | number;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  [key: string]: unknown;
}

export interface HomeData {
  settings: SiteSettings;
  departments: Department[];
  doctors: Doctor[];
  services: Service[];
  announcements: Announcement[];
  news: NewsItem[];
  testimonials: Testimonial[];
  gallery: GalleryItem[];
  leadership: Leader[];
  /** Same shape as Deder HomeController `$heroImages` */
  heroImages?: Array<{ url: string; alt?: string; title?: string }>;
  stats?: {
    total_doctors?: number;
    total_departments?: number;
    total_patients?: number;
    years_experience?: number;
  };
  homeFeaturesTitle?: string;
  homeFeaturesSubtitle?: string;
  homeFeatures?: unknown[];
}

export interface BaseResource {
  id: number;
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  short_description?: string;
  content?: string;
  excerpt?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Department extends BaseResource {
  name: string;
  image_url?: string;
  featured_image?: MediaRef;
}

export interface Doctor extends BaseResource {
  first_name: string;
  last_name: string;
  slug: string;
  designation?: string;
  title?: string;
  bio?: string;
  short_bio?: string;
  photo_url?: string;
  photo?: MediaRef;
  department_id?: number;
  department?: { id: number; name: string; slug?: string } | null;
  education?: unknown;
  certifications?: unknown;
}

export interface Service extends BaseResource {
  name: string;
  image_url?: string;
  featured_image?: MediaRef;
}

export interface Leader extends BaseResource {
  name: string;
  position?: string;
  bio?: string;
  short_bio?: string;
  photo_url?: string;
  photo?: MediaRef;
  email?: string;
  phone?: string;
  certifications?: unknown;
}

export interface LeadershipHistory extends Leader {
  tenure_start?: string;
  tenure_end?: string;
  achievements?: string[] | string;
}

export interface NewsItem extends BaseResource {
  title: string;
  featured_image?: MediaRef;
  image_url?: string;
  published_at?: string;
  author?: string;
}

export interface Announcement extends NewsItem {
  is_pinned?: boolean;
}

export interface GalleryItem extends BaseResource {
  title: string;
  media_url?: string;
  media?: MediaRef;
  category?: string;
}

export interface Page extends BaseResource {
  title: string;
  featured_image?: MediaRef;
}

export interface Event extends BaseResource {
  title: string;
  event_date?: string;
  location?: string;
  featured_image?: MediaRef;
  status?: string;
}

export interface Career extends BaseResource {
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  deadline?: string;
}

export interface Testimonial {
  id: number;
  patient_name: string;
  content: string;
  rating?: number;
  patient_photo?: MediaRef;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category?: string;
}

export interface Insurance extends BaseResource {
  name: string;
  logo?: MediaRef;
  phone?: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
}

export interface EmergencyService extends BaseResource {
  title: string;
  featured_image?: MediaRef;
  services_offered?: string[];
  procedures?: string[];
}

export interface HealthEducation extends BaseResource {
  title: string;
  featured_image?: MediaRef;
  published_at?: string;
  tags?: string[];
}

export interface Partner extends BaseResource {
  name: string;
  category?: string;
  website?: string;
  logo?: MediaRef;
  logo_url?: string;
  order?: number;
  is_active?: boolean;
  contact_email?: string;
  contact_phone?: string;
  partnership_type?: string;
  collaboration_highlights?: string[];
}

export type PublicResource =
  | "departments"
  | "doctors"
  | "services"
  | "leadership"
  | "leadership-history"
  | "news"
  | "announcements"
  | "gallery"
  | "pages"
  | "events"
  | "careers"
  | "testimonials"
  | "faqs"
  | "insurance"
  | "emergency-services"
  | "health-education"
  | "partnerships";
