import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Resolved at request time so a missing NEXT_PUBLIC_SITE_URL at build time no
  // longer bakes localhost into every <loc> (MEL-CFG-001).
  const baseUrl = getSiteUrl();

  const staticRoutes = [
    '',
    '/about',
    '/departments',
    '/services',
    '/doctors',
    '/news',
    '/contact',
    '/careers',
    '/events',
    '/gallery',
    '/leadership',
    '/faqs',
    '/insurance',
    '/emergency',
    '/health-education',
    '/testimonials',
    '/partnerships',
    '/patient-guide',
    '/downloads',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  return staticRoutes;
}
