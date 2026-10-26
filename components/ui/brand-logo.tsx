import React from 'react';
import Image from 'next/image';

interface BrandLogoIconProps {
  className?: string;
  size?: number;
}

/**
 * Standardized SVG Brand Icon for AdOptimize.
 * Uses the official green squircle app icon with the upward trending graph arrow.
 */
export function BrandLogoIcon({ className = 'w-8 h-8', size = 32 }: BrandLogoIconProps) {
  return (
    <Image
      src="/icon.svg"
      alt="AdOptimize Logo"
      width={size}
      height={size}
      className={`object-contain rounded-xl shadow-md shadow-[#00d67d]/20 shrink-0 ${className}`}
      referrerPolicy="no-referrer"
      priority
    />
  );
}

interface BrandLogoProps {
  iconSize?: number;
  iconClassName?: string;
  textClassName?: string;
  theme?: 'dark' | 'light';
}

/**
 * Complete Brand Lockup (Official SVG Logo Icon + "AdOptimize" typography)
 */
export function BrandLogo({
  iconSize = 32,
  iconClassName = 'w-8 h-8',
  textClassName = 'text-xl',
  theme = 'dark',
}: BrandLogoProps) {
  const isLight = theme === 'light';

  return (
    <div className="flex items-center gap-2.5 select-none group">
      <BrandLogoIcon size={iconSize} className={`${iconClassName} group-hover:scale-105 transition-transform`} />
      <div className={`font-extrabold tracking-tight flex items-baseline leading-none ${textClassName}`}>
        <span className={isLight ? 'text-slate-900' : 'text-white'}>Ad</span>
        <span className="text-[#00d67d]">Optimize</span>
      </div>
    </div>
  );
}
