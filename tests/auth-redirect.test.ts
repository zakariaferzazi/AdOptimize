import { describe, expect, it } from 'vitest';
import { parseInterval, safeNext } from '@/lib/auth-redirect';

describe('post-auth redirects', () => {
  it('only accepts known in-app paths, so a crafted next parameter cannot redirect elsewhere', () => {
    expect(safeNext('/chat')).toBe('/chat');
    for (const hostile of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/chat/../admin', '', null, undefined]) {
      expect(safeNext(hostile)).toBe('/dashboard');
    }
  });

  it('defaults an unknown plan interval to monthly', () => {
    expect(parseInterval('yearly')).toBe('yearly');
    expect(parseInterval('free-forever')).toBe('monthly');
    expect(parseInterval(null)).toBe('monthly');
  });
});
