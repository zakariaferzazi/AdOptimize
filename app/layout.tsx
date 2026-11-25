import type { Metadata } from 'next';
import './globals.css';
import { AuthSessionProvider } from '@/components/auth-session-provider';

export const metadata: Metadata = {
  title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
  description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
  metadataBase: new URL(process.env.APP_URL || 'https://adoptimize.app'),
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
    description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
    siteName: 'AdOptimize',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdOptimize - Stop Wasted Google Ads Spend & Increase ROAS',
    description: 'Instant Google Ads audit tool and optimization software. Eliminate negative keyword leaks, lower cost per conversion, and reallocate budget to winners.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-[#f7f8ff] text-slate-900 selection:bg-indigo-200 selection:text-slate-900 font-sans" suppressHydrationWarning>
        <AuthSessionProvider />
        {children}
      </body>
    </html>
  );
}
