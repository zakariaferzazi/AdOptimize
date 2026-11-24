import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => {
  throw new Error('The Firebase client must not initialize during public-page rendering.');
});

import RootLayout from '@/app/layout';

afterEach(() => { vi.unstubAllGlobals(); });

it('server-renders public pages without loading the Firebase-dependent session bridge', () => {
  vi.stubGlobal('React', React);
  const html = renderToString(React.createElement(
    RootLayout, null, React.createElement('main', null, 'Public page content'),
  ));
  expect(html).toContain('<main>Public page content</main>');
});
