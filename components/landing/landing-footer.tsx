import Link from 'next/link';
import { BrandLogoIcon } from '@/components/ui/brand-logo';
import { landing } from './landing-ui';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/faq', label: 'FAQ' },
      { href: '/compare', label: 'Comparisons' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/security', label: 'Security' },
      { href: '/subprocessors', label: 'Subprocessors' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy-policy', label: 'Privacy policy' },
      { href: '/terms-of-service', label: 'Terms of service' },
      { href: '/cookie-policy', label: 'Cookie policy' },
      { href: '/refund-policy', label: 'Refund policy' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className={`${landing.container} grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4`}>
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" aria-label="AdOptimize home">
            <BrandLogoIcon size={28} className="h-7 w-7" />
            <span className="font-bold tracking-tight text-slate-950">Ad<span className="text-indigo-600">optimize</span></span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">The AI Marketing Agent that investigates and executes Google Ads changes you approve.</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={`${column.title} links`}>
            <h2 className="text-sm font-bold text-slate-950">{column.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {column.links.map((link) => (
                <li key={link.href}><Link href={link.href} className="hover:text-slate-950">{link.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className={`${landing.container} flex flex-col gap-3 border-t border-slate-100 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between`}>
        <p>&copy; {new Date().getFullYear()} AdOptimize. All rights reserved.</p>
        <div className="flex gap-5">
          <Link href="/sign-in" className="hover:text-slate-950">Sign in</Link>
          <Link href="/sign-up" className="hover:text-slate-950">Create account</Link>
        </div>
      </div>
    </footer>
  );
}
