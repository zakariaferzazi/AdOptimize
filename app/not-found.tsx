import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f7f8ff] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-indigo-200">
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
        className="site-button"
      >
        Return home
      </Link>
    </div>
  );
}
