import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AdOptimize - AI Marketing Manager for Google Ads',
  description: 'Continuous campaign monitoring, anomaly detection, budget reallocation, and automated audit-proof optimizations for Google Ads.',
  openGraph: {
    title: 'AdOptimize - AI Marketing Manager for Google Ads',
    description: 'Continuous campaign monitoring, anomaly detection, budget reallocation, and automated audit-proof optimizations for Google Ads.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdOptimize - AI Marketing Manager for Google Ads',
    description: 'Continuous campaign monitoring, anomaly detection, budget reallocation, and automated audit-proof optimizations for Google Ads.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function isAbortError(err) {
                  if (!err) return false;
                  var str = typeof err === 'string' ? err : (err.message || String(err));
                  var name = (err && err.name) ? err.name : '';
                  return name === 'AbortError' || str.indexOf('signal is aborted') !== -1 || str.indexOf('aborted') !== -1;
                }
                window.addEventListener('unhandledrejection', function(event) {
                  if (isAbortError(event.reason)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);
                window.addEventListener('error', function(event) {
                  if (isAbortError(event.error) || isAbortError(event.message)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className="h-full bg-[#f6f8fa] text-slate-900 selection:bg-[#00d67d]/20 selection:text-slate-900 font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
