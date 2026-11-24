'use client';

import type { User } from 'firebase/auth';

let pending: Promise<void> = Promise.resolve();

export function synchronizeServerSession(user: User | null): Promise<void> {
  const synchronize = async () => {
    const token = user ? await user.getIdToken() : null;
    const response = await fetch('/api/auth/session', {
      method: user ? 'POST' : 'DELETE', credentials: 'same-origin', cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Your secure session could not be synchronized. Please retry.');
  };
  pending = pending.then(synchronize, synchronize);
  return pending;
}
