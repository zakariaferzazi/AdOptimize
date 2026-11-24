import type { Metadata } from 'next';
import { ChatClientView } from './chat-client';
import { requirePageSubscription } from '@/lib/billing/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Marketing Agent | Autonomous Google Ads Optimization | AdOptimize',
  description: 'Collaborate with your autonomous Google Ads AI Marketing Agent. Diagnose auction shifts, evaluate Quality Scores, draft ad copy, and review campaign performance.',
  alternates: {
    canonical: 'https://adoptimize.app/chat',
  },
  openGraph: {
    title: 'AI Marketing Agent | AdOptimize',
    description: 'Ask anything about your Google Ads performance and execute optimizations with conversational AI.',
    url: 'https://adoptimize.app/chat',
    siteName: 'AdOptimize',
  },
};

export default async function ChatPage() {
  await requirePageSubscription('/chat');
  return <ChatClientView />;
}
