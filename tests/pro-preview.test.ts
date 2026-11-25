import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => React.createElement('main', null, children),
}));
vi.mock('@/components/providers/with-adoptimize', () => ({
  withAdOptimize: (component: React.ComponentType) => component,
}));
vi.mock('@/components/billing/plan-cta', () => ({
  PlanCta: ({ interval, label }: { interval: string; label: string }) => React.createElement('button', { 'data-interval': interval }, label),
}));

import { ProPreview } from '@/components/billing/pro-preview';

afterEach(() => vi.unstubAllGlobals());

it.each(['agent', 'audit', 'optimizer', 'reports'] as const)('shows a labelled, non-interactive %s preview with both upgrade options', (feature) => {
  vi.stubGlobal('React', React);
  const html = renderToStaticMarkup(React.createElement(ProPreview, { feature }));
  expect(html).toContain('Example only, not your account data');
  expect(html).toContain('data-interval="monthly"');
  expect(html).toContain('data-interval="yearly"');
  expect(html).not.toContain('<input');
  expect(html).not.toContain('<form');
});
