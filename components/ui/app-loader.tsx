import React from 'react';
import Image from 'next/image';

export function AppLoader({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <Image
      src="/loader.svg"
      alt=""
      aria-hidden="true"
      width={130}
      height={130}
      unoptimized
      className={`inline-block shrink-0 ${className}`}
    />
  );
}
