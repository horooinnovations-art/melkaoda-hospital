import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gambo-general-hospital-website.onrender.com';

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
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  return staticRoutes;
}
