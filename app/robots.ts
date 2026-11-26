import { MetadataRoute } from 'next';
import { PRIVATE_ROUTES, absoluteUrl, getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', ...PRIVATE_ROUTES],
    },
    host: getSiteUrl(),
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
