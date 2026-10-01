import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 text-[#00d67d] flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-slate-900/10">
        404
      </div>
      <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl mb-3">
        Page Not Found
      </h1>
      <p className="text-slate-600 max-w-md mb-8 text-sm sm:text-base">
        The campaign, report, or page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors shadow-sm"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
