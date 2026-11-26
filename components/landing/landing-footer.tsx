import Link from 'next/link';
import { BrandLogoIcon } from '@/components/ui/brand-logo';
import { landing } from './landing-ui';
import { LandingAccountLink, LandingPrimaryCta } from './session-cta';

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
      { href: '/refund-policy', label: 'Billing & cancellation policy' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[#DDD6FE] bg-white">
      <div className={`${landing.container} grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4`}>
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]" aria-label="AdOptimize home">
            <BrandLogoIcon size={28} className="h-7 w-7" />
            <span className="font-bold tracking-tight text-[#2E1065]">Ad<span className="text-[#6D28D9]">Optimize</span></span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-[#6B7280]">AI agent for Google Ads.</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={`${column.title} links`}>
            <h2 className="text-sm font-bold text-[#2E1065]">{column.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-[#6B7280]">
              {column.links.map((link) => (
                <li key={link.href}><Link href={link.href} className="hover:text-[#2E1065]">{link.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className={`${landing.container} flex flex-col gap-3 border-t border-[#DDD6FE] py-6 text-xs text-[#6B7280] sm:flex-row sm:items-center sm:justify-between`}>
        <div className="space-y-1">
          <p>&copy; {new Date().getFullYear()} AdOptimize. All rights reserved.</p>
          <p>Google Ads is a trademark of Google LLC. AdOptimize is not affiliated with or endorsed by Google.</p>
        </div>
        <div className="flex gap-5">
          <LandingAccountLink className="hover:text-[#2E1065]" />
          <LandingPrimaryCta className="!h-auto !rounded-none !bg-transparent !p-0 !text-[#6B7280] !shadow-none hover:!bg-transparent hover:!text-[#2E1065]" />
        </div>
      </div>
    </footer>
  );
}
