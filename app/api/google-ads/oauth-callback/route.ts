import { NextResponse } from 'next/server';
import { appOrigin } from '@/lib/billing/config';
import { clientIp } from '@/lib/billing/http';
import { hash, rateLimit } from '@/lib/billing/store';
import { completeAuthorization } from '@/lib/google-ads/vault';

export const dynamic = 'force-dynamic';

function page(success: boolean): NextResponse {
  const message = success
    ? 'Google Ads connected. You can close this window.'
    : 'Google Ads could not be connected. Please close this window and try again.';
  const type = success ? 'GOOGLE_ADS_AUTHORIZED' : 'GOOGLE_ADS_OAUTH_ERROR';
  const body = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Google Ads</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#0b0f17;color:#f8fafc;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0"><p>${message}</p>
<script>(function(){${success ? "try{localStorage.setItem('google_ads_authorized',String(Date.now()));localStorage.removeItem('google_ads_authorized');}catch(e){}" : ''}try{if(window.opener){window.opener.postMessage({type:${JSON.stringify(type)}},${JSON.stringify(appOrigin())});}}catch(e){}setTimeout(function(){window.close();},${success ? 300 : 2500});})();</script></body></html>`;
  return new NextResponse(body, {
    status: success ? 200 : 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
    },
  });
}

// Google redirects the popup here. The single-use state binds the code to the user who started the flow.
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const ip = clientIp(request);
    if (ip) await rateLimit(`ads-callback:${hash(ip)}`, 30, 600);
    const code = params.get('code') || '';
    if (params.get('error') || !code) return page(false);
    await completeAuthorization(params.get('state') || '', code);
    return page(true);
  } catch {
    console.error('[GoogleAds] Authorization callback failed.');
    return page(false);
  }
}
