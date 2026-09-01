import type { MetadataRoute } from 'next';
import { getSiteUrl, isSiteUrlConfigured } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  // With no site URL configured this file used to advertise
  // http://localhost:3000/sitemap.xml to real crawlers (MEL-CFG-001). Rather
  // than publish a broken pointer, omit the sitemap line until the deployment
  // knows its own address.
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    ...(isSiteUrlConfigured() ? { sitemap: `${baseUrl}/sitemap.xml`, host: baseUrl } : {}),
  };
}
