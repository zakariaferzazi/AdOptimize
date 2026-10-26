import type { Metadata } from 'next';
import { ChatClientView } from './chat-client';

export const metadata: Metadata = {
  title: 'AI Google Ads Copilot & Assistant | AdOptimize',
  description: 'Chat directly with your autonomous Google Ads AI copilot. Diagnose auction shifts, evaluate Quality Scores, draft ad copy, and review campaign performance.',
  alternates: {
    canonical: 'https://adoptimize.app/chat',
  },
  openGraph: {
    title: 'AI Google Ads Copilot & Assistant | AdOptimize',
    description: 'Ask anything about your Google Ads performance and execute optimizations with conversational AI.',
    url: 'https://adoptimize.app/chat',
    siteName: 'AdOptimize',
  },
};

export default function ChatPage() {
  return <ChatClientView />;
}
