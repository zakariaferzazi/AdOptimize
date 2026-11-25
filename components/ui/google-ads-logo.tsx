import React from 'react';
import Image from 'next/image';

export function GoogleAdsLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <Image src="/assets/google-ads.png" alt="" width={48} height={48} className={className} />
  );
}
