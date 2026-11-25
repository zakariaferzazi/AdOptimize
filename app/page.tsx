import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'AdOptimize | AI Agent for Google Ads',
  description: 'Investigate Google Ads performance, build campaigns, and execute approved optimizations with your AI Marketing Agent.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AdOptimize | AI Agent for Google Ads',
    description: 'Investigate Google Ads performance, build campaigns, and execute approved optimizations with your AI Marketing Agent.',
    url: '/',
    siteName: 'AdOptimize',
    type: 'website',
    images: [{ url: '/auth_panel.png', alt: 'AdOptimize AI marketing workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdOptimize | AI Agent for Google Ads',
    description: 'Investigate Google Ads performance, build campaigns, and execute approved optimizations with your AI Marketing Agent.',
    images: ['/auth_panel.png'],
  },
};

export default function AdOptimizeRootPage() {
  return <LandingPage />;
}
