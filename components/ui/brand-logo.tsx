'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

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
  className = 'w-6 h-6',
  size,
}: {
  className?: string;
  size?: number;
}) {
  const inlineStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;
  return (
    <div
      style={inlineStyle}
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 text-white shadow-sm shadow-emerald-500/20 ${className}`}
    >
      <Sparkles className="w-4/7 h-4/7 text-white" />
    </div>
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
    sm: { icon: 'w-6 h-6', text: 'text-base', gap: 'gap-2' },
    md: { icon: 'w-8 h-8', text: 'text-lg', gap: 'gap-2.5' },
    lg: { icon: 'w-10 h-10', text: 'text-xl', gap: 'gap-3' },
  }[size];

  const content = (
    <div className={`flex items-center ${sizeClasses.gap} ${className}`}>
      <BrandLogoIcon size={iconSize} className={iconClassName || sizeClasses.icon} />
      {showText && (
        <span
          className={`font-bold tracking-tight ${
            textClassName ||
            (theme === 'dark' ? 'text-white' : 'text-slate-900') + ' ' + sizeClasses.text
          }`}
        >
          Ad<span className="text-[#00d67d]">optimize</span>
          <span className="text-xs ml-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold uppercase tracking-wider">
            AI
          </span>
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
