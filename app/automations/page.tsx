import type { Metadata } from 'next';
import { AutomationsClientView } from './automations-client';

export const metadata: Metadata = {
  title: 'Automated Google Ads Safeguards & 24/7 Rules | AdOptimize',
  description: 'Set up automated safeguards to detect sudden CPA runaway spikes, prevent budget drift, and pause non-converting bleeders around the clock.',
  alternates: {
    canonical: 'https://adoptimize.app/automations',
  },
  openGraph: {
    title: 'Automated Google Ads Safeguards & 24/7 Rules | AdOptimize',
    description: 'Set up 24/7 automated safeguards for Google Ads: pause CPA spikes, prevent runaway drift, and stop click waste.',
    url: 'https://adoptimize.app/automations',
    siteName: 'AdOptimize',
  },
};

export default function AutomationsPage() {
  return <AutomationsClientView />;
}
