'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
  theme?: string;
  iconSize?: number;
  iconClassName?: string;
  textClassName?: string;
}

export function BrandLogoIcon({
  className = 'w-7 h-7',
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/icon.svg"
      alt="AdOptimize"
      width={size}
      height={size}
      className={`rounded-xl object-contain shrink-0 ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}

export function BrandLogo({
  className = '',
  showText = true,
  size = 'md',
  asLink = true,
  theme,
  iconSize,
  iconClassName,
  textClassName,
}: BrandLogoProps) {
  const sizeClasses = {
    sm: { icon: 'w-6 h-6', px: 24, text: 'text-base', gap: 'gap-2' },
    md: { icon: 'w-8 h-8', px: 32, text: 'text-lg', gap: 'gap-2.5' },
    lg: { icon: 'w-10 h-10', px: 40, text: 'text-xl', gap: 'gap-3' },
  }[size];

  const content = (
    <div className={`flex items-center ${sizeClasses.gap} ${className}`}>
      <BrandLogoIcon
        size={iconSize || sizeClasses.px}
        className={iconClassName || sizeClasses.icon}
      />
      {showText && (
        <span
          className={`font-bold tracking-tight ${
            textClassName ||
            (theme === 'dark' ? 'text-white' : 'text-slate-900') + ' ' + sizeClasses.text
          }`}
        >
          Ad<span className="text-[#00d67d]">optimize</span>
        </span>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" className="inline-flex items-center hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
