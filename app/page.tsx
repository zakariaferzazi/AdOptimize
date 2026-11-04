import type { Metadata } from 'next';
import { AdOptimizeRootClient } from './root-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
  description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
  alternates: {
    canonical: '/',
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

export default function AdOptimizeRootPage() {
  return <AdOptimizeRootClient />;
}
