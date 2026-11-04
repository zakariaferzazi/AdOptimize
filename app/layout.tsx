import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
  description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
  metadataBase: new URL(process.env.APP_URL || 'https://adoptimize.app'),
  alternates: {
    canonical: '/',
  },
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
    title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
    description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
    url: 'https://adoptimize.app',
    siteName: 'AdOptimize',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
    description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  const globalSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'AdOptimize',
        url: 'https://adoptimize.app',
        logo: 'https://adoptimize.app/icon.svg',
        sameAs: ['https://twitter.com/adoptimize'],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'AdOptimize',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '49',
          priceCurrency: 'USD',
        },
        description: 'Instant Google Ads audit and budget optimization software for high-growth businesses and agencies.',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: '340',
        },
      },
    ],
  };

  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-[#f6f8fa] text-slate-900 selection:bg-[#00d67d]/20 selection:text-slate-900 font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
