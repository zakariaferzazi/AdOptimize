import { MetadataRoute } from 'next';
import { PSEO_TOOLS, PSEO_SOLUTIONS, PSEO_FEATURES } from '@/lib/pseo-data';
import { PSEO_COMPARISONS } from '@/lib/comparison-data';
import { BLOG_POSTS } from '@/lib/blog-data';
import { absoluteUrl, SITE_CONTENT_UPDATED } from '@/lib/seo';

// Only public, indexable pages belong here. Sign-in, billing and workspace routes are excluded (see PRIVATE_ROUTES).
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/tools', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/solutions', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/compare', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/security', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/subprocessors', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/terms-of-service', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/refund-policy', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/cookie-policy', priority: 0.4, changeFrequency: 'monthly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const contentUpdated = new Date(SITE_CONTENT_UPDATED);

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: contentUpdated,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  PSEO_FEATURES.forEach((feat) => {
    entries.push({ url: absoluteUrl(`/features/${feat.slug}`), lastModified: contentUpdated, changeFrequency: 'weekly', priority: 0.7 });
  });

  PSEO_TOOLS.forEach((tool) => {
    entries.push({ url: absoluteUrl(`/tools/${tool.slug}`), lastModified: contentUpdated, changeFrequency: 'weekly', priority: 0.85 });
  });

  PSEO_SOLUTIONS.forEach((sol) => {
    entries.push({ url: absoluteUrl(`/solutions/${sol.slug}`), lastModified: contentUpdated, changeFrequency: 'weekly', priority: 0.7 });
  });

  PSEO_COMPARISONS.forEach((comp) => {
    entries.push({ url: absoluteUrl(`/compare/${comp.slug}`), lastModified: contentUpdated, changeFrequency: 'weekly', priority: 0.8 });
  });

  BLOG_POSTS.forEach((post) => {
    entries.push({ url: absoluteUrl(`/blog/${post.slug}`), lastModified: new Date(post.updatedAt), changeFrequency: 'monthly', priority: 0.7 });
  });

  return entries;
}

