import { MetadataRoute } from 'next';
import { PSEO_TOOLS, PSEO_SOLUTIONS, PSEO_COMPARISONS } from '@/lib/pseo-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL || 'https://adoptimize.io';

  const staticRoutes = [
    '',
    '/features',
    '/pricing',
    '/about',
    '/contact',
    '/faq',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy',
    '/cookie-policy',
    '/security',
    '/subprocessors',
    '/tools',
    '/solutions',
    '/compare',
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route.startsWith('/tools') || route.startsWith('/pricing') ? 0.9 : 0.8,
  }));

  // Add Programmatic SEO Tools routes
  PSEO_TOOLS.forEach((tool) => {
    entries.push({
      url: `${baseUrl}/tools/${tool.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    });
  });

  // Add Programmatic SEO Solutions routes
  PSEO_SOLUTIONS.forEach((sol) => {
    entries.push({
      url: `${baseUrl}/solutions/${sol.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    });
  });

  // Add Programmatic SEO Comparisons routes
  PSEO_COMPARISONS.forEach((comp) => {
    entries.push({
      url: `${baseUrl}/compare/${comp.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  return entries;
}
