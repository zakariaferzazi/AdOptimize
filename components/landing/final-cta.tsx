import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { landing } from './landing-ui';

export function FinalCta() {
  return (
    <section className={`${landing.container} pb-20 sm:pb-28`} aria-labelledby="final-cta-heading">
      <div className="rounded-[2rem] bg-indigo-950 px-7 py-14 text-center text-white sm:px-14 sm:py-20">
        <h2 id="final-cta-heading" className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Give your campaigns an agent that acts. You keep the final say.
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-indigo-100">
          Connect your account and see what the agent finds.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-indigo-900 transition-colors hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Create free account <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a href="#pricing" className="inline-flex items-center gap-2 rounded-full border border-indigo-300 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            See Pro pricing
          </a>
        </div>
      </div>
    </section>
  );
}
