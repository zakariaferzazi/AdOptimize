import { LandingHeader } from './landing-header';
import { Hero, InsideWorkspace } from './hero';
import { Capabilities } from './capabilities';
import { HowItWorks } from './how-it-works';
import { PricingSection } from './pricing-section';
import { FaqSection } from './faq';
import { FinalCta } from './final-cta';
import { LandingFooter } from './landing-footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Skip to content
      </a>
      <LandingHeader />
      <main id="main">
        <Hero />
        <Capabilities />
        <InsideWorkspace />
        <HowItWorks />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
