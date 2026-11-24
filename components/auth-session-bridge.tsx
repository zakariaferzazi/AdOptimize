'use client';

import { useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { synchronizeServerSession } from '@/lib/auth-session';

export function AuthSessionBridge() {
  const router = useRouter();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      if (auth.currentUser?.uid !== user?.uid) return;
      void synchronizeServerSession(user).then(() => {
        if (active && auth.currentUser?.uid === user?.uid) { setError(false); router.refresh(); }
      }).catch(() => { if (user && active && auth.currentUser?.uid === user.uid) setError(true); });
    }, () => { if (active) setError(true); });
    const timer = setInterval(() => {
      if (auth.currentUser) void auth.currentUser.getIdToken().catch(() => { if (active) setError(true); });
    }, 4 * 60 * 1000);
    return () => { active = false; unsubscribe(); clearInterval(timer); };
  }, [router]);
  if (!error) return null;
  return <div role="alert" className="fixed bottom-4 left-4 right-4 z-[100] rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-900 shadow-lg">
    Secure sign-in could not be synchronized. Paid pages may be unavailable.
    <button className="ml-3 font-semibold underline" onClick={() => {
      void synchronizeServerSession(auth.currentUser).then(() => { setError(false); router.refresh(); }).catch(() => setError(true));
    }}>Retry</button>
  </div>;
}
