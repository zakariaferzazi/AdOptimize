import React from 'react';

export function GoogleAdsLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12.08 4.2c-4.42 2.55-5.94 8.2-3.39 12.62l12.74 22.06c2.55 4.42 8.2 5.94 12.62 3.39 4.42-2.55 5.94-8.2 3.39-12.62L24.7 7.59C22.15 3.17 16.5 1.65 12.08 4.2z"
        fill="#4285F4"
      />
      <path
        d="M4.39 30.79c-2.55-4.42-1.03-10.07 3.39-12.62 4.42-2.55 10.07-1.03 12.62 3.39l6.37 11.03c2.55 4.42 1.03 10.07-3.39 12.62-4.42 2.55-10.07 1.03-12.62-3.39L4.39 30.79z"
        fill="#FBBC04"
      />
      <circle cx="12" cy="36" r="6" fill="#34A853" />
    </svg>
  );
}
