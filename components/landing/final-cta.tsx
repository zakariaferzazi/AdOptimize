import { landing } from './landing-ui';
import { LandingPrimaryCta } from './session-cta';

export function FinalCta() {
  return (
    <section className={`${landing.container} ${landing.section}`} aria-labelledby="final-cta-heading">
      <div className="rounded-xl bg-[#2E1065] px-7 py-14 text-center text-white sm:px-14 sm:py-20">
        <h2 id="final-cta-heading" className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Start with a free Google Ads audit. Know your next move.
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-[#DDD6FE]">
          Review your account with five free audits per month. Upgrade to Pro when you want the dashboard and an agent that builds, manages and optimizes campaigns on your behalf.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LandingPrimaryCta className="!bg-[#FBBF24] !text-[#2E1065] hover:!bg-amber-300 focus-visible:!outline-white w-full sm:w-auto" />
          <a href="#pricing" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white bg-transparent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none sm:w-auto">
            See Pro pricing
          </a>
        </div>
      </div>
    </section>
  );
}
