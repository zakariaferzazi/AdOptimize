import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFlow } from '@/components/auth/auth-flow';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Create your account | AdOptimize',
  description: 'Create your account, choose a plan, and launch your AI marketing agent for Google Ads.',
  robots: PRIVATE_ROBOTS,
};

export default function SignUpPage() {
  return <Suspense><AuthFlow mode="sign-up" /></Suspense>;
}
