import { LandingHeader } from './landing-header';
import { Hero } from './hero';
import { FreeAudit } from './free-audit';
import { FeatureBlocks } from './feature-blocks';
import { Capabilities } from './capabilities';
import { HowItWorks } from './how-it-works';
import { PricingSection } from './pricing-section';
import { Comparisons } from './comparisons';
import { FaqSection } from './faq';
import { FinalCta } from './final-cta';
import { LandingFooter } from './landing-footer';
import { LandingSessionProvider } from './session-cta';

export function LandingPage() {
  return (
    <LandingSessionProvider>
      <div className="min-h-screen bg-white font-sans text-[#1F2937] antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[#6D28D9] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]">
          Skip to content
        </a>
        <LandingHeader />
        <main id="main">
          <Hero />
          <FreeAudit />
          <FeatureBlocks />
          <Capabilities />
          <HowItWorks />
          <PricingSection />
          <Comparisons />
          <FaqSection />
          <FinalCta />
        </main>
        <LandingFooter />
      </div>
    </LandingSessionProvider>
  );
}
