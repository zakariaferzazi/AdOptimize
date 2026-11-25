import { describe, expect, it } from 'vitest';
import { authFlowLink, parseInterval, safeNext } from '@/lib/auth-redirect';

describe('post-auth redirects', () => {
  it('only accepts known in-app paths, so a crafted next parameter cannot redirect elsewhere', () => {
    expect(safeNext('/chat')).toBe('/chat');
    expect(safeNext('/billing/success')).toBe('/billing/success');
    for (const hostile of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/chat/../admin', '', null, undefined]) {
      expect(safeNext(hostile)).toBe('/dashboard');
    }
  });

  it('defaults an unknown plan interval to monthly', () => {
    expect(parseInterval('yearly')).toBe('yearly');
    expect(parseInterval('free-forever')).toBe('monthly');
    expect(parseInterval(null)).toBe('monthly');
  });

  it('preserves a selected billing interval and safe destination when switching auth modes', () => {
    expect(authFlowLink('sign-in', '/audit', 'yearly')).toBe('/sign-in?next=%2Faudit&plan=yearly');
    expect(authFlowLink('sign-up', '/dashboard', 'monthly')).toBe('/sign-up?plan=monthly');
    expect(authFlowLink('sign-up', '/dashboard', 'invalid')).toBe('/sign-up');
  });
});
