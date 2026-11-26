import type { Metadata } from 'next';
import './globals.css';
import { AuthSessionProvider } from '@/components/auth-session-provider';
import { absoluteUrl, buildGlobalSchema, DEFAULT_OG_IMAGE, getSiteUrl, serializeJsonLd, SITE_NAME } from '@/lib/seo';

const defaultTitle = 'AdOptimize | AI Marketing Agent for Google Ads';
const defaultDescription = 'AI marketing agent for Google Ads. It analyzes your account, drafts campaign and budget changes, and applies only the changes you approve.';

export const metadata: Metadata = {
  title: defaultTitle,
  description: defaultDescription,
  metadataBase: new URL(getSiteUrl()),
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: absoluteUrl('/'),
    siteName: SITE_NAME,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, alt: `${SITE_NAME} AI marketing agent for Google Ads` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-white text-[#1F2937] selection:bg-[#DDD6FE] selection:text-[#2E1065] font-sans" suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildGlobalSchema()) }} />
        <AuthSessionProvider />
        {children}
      </body>
    </html>
  );
}

