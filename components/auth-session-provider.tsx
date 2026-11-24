'use client';

import dynamic from 'next/dynamic';

const AuthSessionBridge = dynamic(
  () => import('@/components/auth-session-bridge').then((module) => module.AuthSessionBridge),
  { ssr: false },
);

export function AuthSessionProvider() {
  return <AuthSessionBridge />;
}
