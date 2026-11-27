import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  input: '', question: '', stringCalls: 0,
  setInput: vi.fn(), setQuestion: vi.fn(), fetch: vi.fn(), store: vi.fn(),
}));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => initial !== '' ? [initial, vi.fn()]
    : mocks.stringCalls++ % 2 === 0 ? [mocks.input, mocks.setInput] : [mocks.question, mocks.setQuestion],
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/chat' }));
import { ChatPreview, ProPreview } from '@/components/billing/pro-preview';

beforeEach(() => {
  mocks.input = '';
  mocks.question = '';
  mocks.stringCalls = 0;
  mocks.setInput.mockReset().mockImplementation((value: string) => { mocks.input = value; });
  mocks.setQuestion.mockReset().mockImplementation((value: string) => { mocks.question = value; });
  mocks.fetch.mockReset();
  mocks.store.mockReset();
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubGlobal('localStorage', { setItem: mocks.store });
});
afterEach(() => vi.unstubAllGlobals());

type FormElement = React.ReactElement<{ children?: React.ReactNode; onSubmit?: (event: { preventDefault: () => void }) => void }>;
function findForm(node: React.ReactNode): FormElement | undefined {
  if (Array.isArray(node)) return node.map(findForm).find(Boolean);
  if (!React.isValidElement<FormElement['props']>(node)) return undefined;
  return node.type === 'form' ? node : findForm(node.props.children);
}

describe('Free workspace previews', () => {
  it.each(['dashboard', 'campaigns', 'chat', 'reports', 'optimizer', 'activity_log'] as const)('provides navigation, a truthful sample and upgrade path for %s', (feature) => {
    const html = renderToStaticMarkup(React.createElement(ProPreview, { feature }));
    expect(html).toContain('Pro feature preview');
    expect(html).toContain('not your connected account');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/audit"');
    expect(html).toContain('href="/settings"');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('responds to a message with an upgrade prompt without invoking AI, writing history or executing changes', () => {
    mocks.input = '  Build a campaign with a $25 daily budget.  ';
    const form = findForm(ChatPreview());
    if (!form?.props.onSubmit) throw new Error('Missing preview form');
    const preventDefault = vi.fn();
    form.props.onSubmit({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(mocks.setQuestion).toHaveBeenCalledWith('Build a campaign with a $25 daily budget.');
    expect(mocks.setInput).toHaveBeenCalledWith('');
    mocks.stringCalls = 0;
    const html = renderToStaticMarkup(React.createElement(ChatPreview));
    expect(html).toContain('Upgrade to Pro to use the AI Marketing Agent.');
    expect(html).toContain('Build a campaign with a $25 daily budget.');
    expect(html).toContain('See Pro plans');
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.store).not.toHaveBeenCalled();
  });
});
