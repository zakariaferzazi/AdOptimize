import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL || 'https://adoptimize.io';

  const routes = [
    '',
    '/features',
    '/pricing',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy',
    '/faq',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
