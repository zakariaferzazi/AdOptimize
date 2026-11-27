import type { Metadata } from 'next';

export const SITE_NAME = 'AdOptimize';
export const SITE_CONTENT_UPDATED = '2026-11-27';
export const DEFAULT_OG_IMAGE = '/auth_panel.png';

// Sign-in, billing and workspace routes are account-specific: keep them out of search and the sitemap.
export const PRIVATE_ROUTES = [
  '/dashboard',
  '/campaigns',
  '/audit',
  '/optimizer',
  '/chat',
  '/activity-log',
  '/settings',
  '/reports',
  '/billing',
  '/sign-in',
  '/sign-up',
] as const;

export const PRIVATE_ROBOTS: NonNullable<Metadata['robots']> = { index: false, follow: false };

export function getSiteUrl(): string {
  return (process.env.APP_URL || 'https://adoptimize.app').replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  return path === '/' ? getSiteUrl() : `${getSiteUrl()}${path}`;
}

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}

export function buildPageMetadata({
  title,
  description,
  path,
  type = 'website',
  publishedTime,
  modifiedTime,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const image = { url: DEFAULT_OG_IMAGE, alt: `${SITE_NAME} AI marketing agent for Google Ads` };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: [image],
      ...(type === 'article' ? { publishedTime, modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

// Escapes "<" so that JSON-LD cannot close its enclosing <script> tag.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function buildGlobalSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: SITE_NAME,
        url: getSiteUrl(),
        logo: absoluteUrl('/icon.svg'),
        description: 'AdOptimize offers a free Google Ads audit plan with five read-only audits per month, plus a Pro AI marketing agent for approved campaign management.',
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@adoptimize.app',
          contactType: 'customer support',
        },
      },
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: getSiteUrl(),
      },
    ],
  };
}
