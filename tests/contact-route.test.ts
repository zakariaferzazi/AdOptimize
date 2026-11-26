import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/contact/route';

describe('contact tickets', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requires server email credentials without accepting a fake success', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('CONTACT_FROM_EMAIL', '');
    vi.stubEnv('APP_URL', 'https://adoptimize.app');
    const response = await POST(new Request('https://adoptimize.app/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://adoptimize.app' },
      body: JSON.stringify({ name: 'Taylor', email: 'taylor@example.com', message: 'Please help me connect my account.' }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('support@adoptimize.app') });
  });

  it('delivers to support with the requester as reply-to', async () => {
    vi.stubEnv('RESEND_API_KEY', 'server-only-key');
    vi.stubEnv('CONTACT_FROM_EMAIL', 'AdOptimize <contact@adoptimize.app>');
    vi.stubEnv('APP_URL', 'https://adoptimize.app');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'email-id' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(new Request('https://adoptimize.app/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://adoptimize.app' },
      body: JSON.stringify({ name: 'Taylor', email: 'Taylor@Example.com', message: 'I need help with subscription billing.' }),
    }));

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.to).toEqual(['support@adoptimize.app']);
    expect(payload.reply_to).toBe('taylor@example.com');
    expect(payload.text).toContain('I need help with subscription billing.');
  });

  it('silently absorbs honeypot submissions', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await POST(new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Bot', email: 'bot@example.com', message: 'spam message', website: 'https://spam.test' }),
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
