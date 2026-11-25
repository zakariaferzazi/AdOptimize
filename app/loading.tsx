import { AppLoader } from '@/components/ui/app-loader';

export default function Loading() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center bg-white">
      <AppLoader className="h-20 w-20" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

