import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
  description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
    description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
    url: '/',
    siteName: 'AdOptimize',
    type: 'website',
    images: [{ url: '/auth_panel.png', alt: 'AdOptimize AI marketing workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
    description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
    images: ['/auth_panel.png'],
  },
};

export default function AdOptimizeRootPage() {
  return <LandingPage />;
}
