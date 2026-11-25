import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { PostPaymentConnect } from '@/components/billing/post-payment-connect';

const mocks = vi.hoisted(() => ({ connect: vi.fn(), clicks: [] as Array<() => void> }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    default: {
      ...actual,
      createElement: (...args: Parameters<typeof React.createElement>) => {
        const [type, props] = args;
        if (type === 'button' && props && 'onClick' in props && typeof props.onClick === 'function') {
          const click = props.onClick;
          mocks.clicks.push(() => { click(); });
        }
        return actual.createElement(...args);
      },
    },
  };
});
vi.mock('@/context/adoptimize-context', () => ({
  AdOptimizeProvider: ({ children }: { children: React.ReactNode }) => children,
  useAdOptimize: () => ({
    user: { uid: 'user-a' }, authLoading: false, isInitialLoading: false,
    state: { account: { isConnected: false, clientCustomerId: 'Not Connected' } },
    handleConnectAccount: vi.fn(),
  }),
}));
vi.mock('@/hooks/use-google-ads-connection', () => ({
  useGoogleAdsConnection: () => ({ connect: mocks.connect, discoveredAccounts: [], loadingState: null, errorMessage: null }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/lib/auth-session', () => ({ synchronizeServerSession: vi.fn() }));

it('starts linking directly from the final-step button, without another connect dialog', () => {
  renderToStaticMarkup(React.createElement(PostPaymentConnect));
  mocks.clicks[0]();
  expect(mocks.connect).toHaveBeenCalledOnce();
});
