import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandLogoIcon } from '@/components/ui/brand-logo';
import { landing } from './landing-ui';

const navItems = [
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#DDD6FE] bg-white/95 backdrop-blur">
      <div className={`${landing.container} flex h-16 items-center justify-between gap-4 sm:h-20`}>
        <Link href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]" aria-label="AdOptimize home">
          <BrandLogoIcon size={32} className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-[#2E1065]">Ad<span className="text-[#6D28D9]">Optimize</span></span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-[#6B7280] md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-[#2E1065] motion-reduce:transition-none">{item.label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/sign-in" className="hidden text-sm font-semibold text-[#1F2937] hover:text-[#2E1065] sm:inline">Sign in</Link>
          <Link href="/sign-up" className={`${landing.btnPrimary} max-sm:!hidden`}>
            Create free account <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <details className="group relative md:hidden">
            <summary className="flex h-12 cursor-pointer list-none items-center rounded-xl border border-[#6D28D9] px-4 text-sm font-semibold text-[#6D28D9] marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]">Menu</summary>
            <nav aria-label="Mobile navigation" className="absolute right-0 mt-3 w-56 rounded-xl border border-[#DDD6FE] bg-white p-2 shadow-sm">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#1F2937] hover:bg-[#F5F3FF]">{item.label}</a>
              ))}
              <Link href="/sign-in" className="block rounded-xl px-4 py-3 text-sm font-medium text-[#1F2937] hover:bg-[#F5F3FF]">Sign in</Link>
              <Link href="/sign-up" className="mt-1 flex h-12 items-center justify-center rounded-xl bg-[#6D28D9] px-6 py-3 text-center text-sm font-semibold text-white hover:bg-[#5B21B6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9] motion-reduce:transition-none">Create free account</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
