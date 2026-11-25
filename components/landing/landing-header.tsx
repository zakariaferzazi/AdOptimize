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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className={`${landing.container} flex h-16 items-center justify-between gap-4 sm:h-20`}>
        <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" aria-label="AdOptimize home">
          <BrandLogoIcon size={32} className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-slate-950">Ad<span className="text-indigo-600">optimize</span></span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-slate-950">{item.label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/sign-in" className="hidden text-sm font-semibold text-slate-700 hover:text-slate-950 sm:inline">Sign in</Link>
          <a href="#pricing" className={`${landing.btnPrimary} !px-4 !py-2.5 !text-[13px]`}>
            Get Pro <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <details className="group relative md:hidden">
            <summary className="flex cursor-pointer list-none items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 marker:content-none">Menu</summary>
            <nav aria-label="Mobile navigation" className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{item.label}</a>
              ))}
              <Link href="/sign-in" className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Sign in</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
