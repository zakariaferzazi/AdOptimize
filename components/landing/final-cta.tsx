import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { landing } from './landing-ui';

export function FinalCta() {
  return (
    <section className={`${landing.container} ${landing.section}`} aria-labelledby="final-cta-heading">
      <div className="rounded-xl bg-[#2E1065] px-7 py-14 text-center text-white sm:px-14 sm:py-20">
        <h2 id="final-cta-heading" className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Give your campaigns an agent that acts. You keep the final say.
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-[#DDD6FE]">
          Connect your account and see what the agent finds.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/sign-up" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FBBF24] px-6 py-3 text-sm font-bold text-[#2E1065] transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none sm:w-auto">
            Create free account <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a href="#pricing" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white bg-transparent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none sm:w-auto">
            See Pro pricing
          </a>
        </div>
      </div>
    </section>
  );
}
