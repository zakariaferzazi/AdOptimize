'use client';

import React from 'react';
import { AdOptimizeProvider } from '@/context/adoptimize-context';

export function withAdOptimize<P extends object>(Component: React.ComponentType<P>) {
  function WrappedWithAdOptimize(props: P) {
    return (
      <AdOptimizeProvider allowPaidSync={!('hasProAccess' in props) || props.hasProAccess !== false}>
        <Component {...props} />
      </AdOptimizeProvider>
    );
  }

  WrappedWithAdOptimize.displayName = `withAdOptimize(${Component.displayName || Component.name || 'Component'})`;
  return WrappedWithAdOptimize;
}
