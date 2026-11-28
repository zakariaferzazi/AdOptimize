import React from 'react';
import Link from 'next/link';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCleanInitialState } from '@/lib/data-provider';

const mocks = vi.hoisted(() => ({ states: [] as unknown[], index: 0, effects: [] as Array<() => unknown>, fetch: vi.fn(), store: vi.fn(), read: vi.fn() }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = mocks.index++;
      if (!(index in mocks.states)) mocks.states[index] = typeof initial === 'function' ? initial() : initial;
      return [mocks.states[index], (value: unknown) => {
        mocks.states[index] = typeof value === 'function' ? value(mocks.states[index]) : value;
      }];
    },
    useRef: (initial: unknown) => ({ current: initial }),
    useMemo: (fn: () => unknown) => fn(),
    useEffect: (effect: () => unknown) => { mocks.effects.push(effect); },
  };
});
vi.mock('@/hooks/use-click-outside', () => ({ useClickOutside: () => ({ current: null }) }));
vi.mock('@/lib/firebase', () => ({ auth: {} }));
import { AiChatView } from '@/components/chat/ai-chat-view';

function find(node: React.ReactNode, predicate: (element: React.ReactElement<{ children?: React.ReactNode; onClick?: () => void }>) => boolean): React.ReactElement<{ children?: React.ReactNode; onClick?: () => void }> | undefined {
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (!React.isValidElement<{ children?: React.ReactNode; onClick?: () => void }>(node)) return undefined;
  return predicate(node) ? node : find(node.props.children, predicate);
}

function text(node: React.ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join('');
  if (typeof node === 'string') return node;
  return React.isValidElement<{ children?: React.ReactNode }>(node) ? text(node.props.children) : '';
}

beforeEach(() => {
  mocks.states = [];
  mocks.index = 0;
  mocks.effects = [];
  mocks.fetch.mockReset();
  mocks.store.mockReset();
  mocks.read.mockReset();
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubGlobal('localStorage', { getItem: mocks.read, setItem: mocks.store });
});
afterEach(() => vi.unstubAllGlobals());

describe('Free agent workspace', () => {
  it('uses the real chat and responds locally to a suggested prompt', () => {
    const state = getCleanInitialState();
    const props = {
      account: state.account, campaigns: [], keywords: [], searchTerms: [], auditLogs: [],
      anomalies: [], insights: [], recommendations: [], rules: [], preview: true,
    };
    const tree = AiChatView(props);
    mocks.effects[1]();
    const suggestion = find(tree, (element) => element.type === 'button' && text(element).includes('Find Wasted Spend'));
    expect(suggestion?.props.onClick).toBeDefined();
    suggestion?.props.onClick?.();
    mocks.index = 0;
    const updated = AiChatView(props);
    expect(text(updated)).toContain('Upgrade to Pro to use the AI Marketing Agent');
    expect(find(updated, (element) => element.type === Link && text(element).includes('See Pro plans'))).toBeDefined();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.store).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
