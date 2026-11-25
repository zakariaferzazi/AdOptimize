import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acquireGoogleAdsToken } from '@/lib/google-identity';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/authenticated-fetch', () => ({ authenticatedFetch: mocks.fetch }));

let browser: EventTarget & { open: ReturnType<typeof vi.fn> };
let popup: { closed: boolean; close: ReturnType<typeof vi.fn>; location: { replace: ReturnType<typeof vi.fn> } };
beforeEach(() => {
  popup = { closed: false, close: vi.fn(), location: { replace: vi.fn() } };
  browser = Object.assign(new EventTarget(), {
    open: vi.fn(() => popup), screenX: 0, screenY: 0, outerWidth: 1024, outerHeight: 768,
    location: { origin: 'https://app.example.test' },
  });
  vi.stubGlobal('window', browser);
  const storage = { getItem: () => null, setItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  mocks.fetch.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Google Ads authorization popup', () => {
  it('opens before waiting for the authorization request and then navigates that same popup', async () => {
    let resolveStart: (response: Response) => void = () => {};
    mocks.fetch.mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveStart = resolve; }))
      .mockResolvedValue(Response.json({ accessToken: 'test-access-token', expiresAt: Date.now() + 3600000 }));
    const result = acquireGoogleAdsToken({ forceFresh: true });
    expect(browser.open).toHaveBeenCalledWith('about:blank', 'google_ads_oauth_window', expect.any(String));
    expect(popup.location.replace).not.toHaveBeenCalled();
    resolveStart(Response.json({ url: 'https://accounts.google.com/authorization' }));
    await vi.waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith('https://accounts.google.com/authorization'));
    browser.dispatchEvent(Object.assign(new Event('message'), {
      origin: 'https://app.example.test', source: popup, data: { type: 'GOOGLE_ADS_AUTHORIZED' },
    }));
    await expect(result).resolves.toBe('test-access-token');
    expect(browser.open).toHaveBeenCalledOnce();
    expect(popup.close).toHaveBeenCalledOnce();
  });

  it('closes the blank popup and surfaces an authorization endpoint failure', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ error: 'Authorization unavailable' }, { status: 503 }));
    await expect(acquireGoogleAdsToken({ forceFresh: true })).rejects.toThrow('Authorization unavailable');
    expect(popup.close).toHaveBeenCalledOnce();
  });

  it('explains blocked popups without starting authorization', async () => {
    browser.open.mockReturnValue(null);
    await expect(acquireGoogleAdsToken({ forceFresh: true })).rejects.toThrow('Popup window was blocked');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
