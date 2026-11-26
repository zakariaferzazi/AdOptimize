import type { Metadata } from 'next';
import { ChatClientView } from './chat-client';
import { requirePageSubscription } from '@/lib/billing/access';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Marketing Agent | Google Ads Analysis and Management | AdOptimize',
  description: 'Use the AdOptimize AI Marketing Agent to analyze Google Ads performance, prepare campaigns, and review proposed account changes before execution.',
  robots: PRIVATE_ROBOTS,
};

export default async function ChatPage() {
  await requirePageSubscription('/chat');
  return <ChatClientView />;
}
