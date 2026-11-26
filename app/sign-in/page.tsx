import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFlow } from '@/components/auth/auth-flow';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sign in | AdOptimize',
  description: 'Sign in to your AdOptimize AI marketing agent.',
  robots: PRIVATE_ROBOTS,
};

export default function SignInPage() {
  return <Suspense><AuthFlow mode="sign-in" /></Suspense>;
}
