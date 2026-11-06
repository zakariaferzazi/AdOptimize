import { Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa] px-6">
      <div className="w-full max-w-5xl space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 rounded-xl bg-slate-200" />
          <div className="h-9 w-32 rounded-xl bg-white border border-slate-200" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 rounded-3xl bg-white border border-slate-200" />
          ))}
        </div>
        <div className="h-72 rounded-3xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
            <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
            Loading workspace...
          </div>
        </div>
      </div>
    </div>
  );
}
