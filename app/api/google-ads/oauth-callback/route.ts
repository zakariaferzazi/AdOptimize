import { NextResponse } from 'next/server';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AdOptimize - Google Ads Authorization</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 24px;
      padding: 36px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3.5px solid #1f2937;
      border-top-color: #00d67d;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 { margin: 0 0 10px; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    p { margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5; }
    .status {
      margin-top: 18px;
      font-size: 12px;
      color: #00d67d;
      font-weight: 600;
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(0, 214, 125, 0.1);
      border: 1px solid rgba(0, 214, 125, 0.2);
    }
    .error-box {
      color: #fb7185;
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <h2 id="title">Connecting Google Ads</h2>
    <p id="desc">Securely transferring authorization to AdOptimize. This window will close automatically...</p>
    <div class="status" id="status">Verifying credentials...</div>
  </div>

  <script>
    (function() {
      function completeOAuth() {
        var statusEl = document.getElementById('status');
        var descEl = document.getElementById('desc');
        var titleEl = document.getElementById('title');
        var spinner = document.getElementById('spinner');

        var hash = window.location.hash.substring(1);
        var hashParams = new URLSearchParams(hash);
        var searchParams = new URLSearchParams(window.location.search);

        var token = hashParams.get('access_token') || searchParams.get('access_token');
        var error = hashParams.get('error') || searchParams.get('error');
        var errorDesc = hashParams.get('error_description') || searchParams.get('error_description');

        if (error) {
          if (titleEl) titleEl.textContent = 'Authorization Failed';
          if (descEl) descEl.textContent = errorDesc || error;
          if (statusEl) {
            statusEl.textContent = 'Error: ' + error;
            statusEl.className = 'status error-box';
          }
          if (spinner) spinner.style.display = 'none';

          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({
                type: 'GOOGLE_ADS_OAUTH_ERROR',
                error: errorDesc || error
              }, '*');
            } catch (e) {}
            setTimeout(function() { window.close(); }, 2500);
          }
          return;
        }

        if (token) {
          if (statusEl) statusEl.textContent = 'Connected! Closing window...';
          try {
            sessionStorage.setItem('google_ads_oauth_token', token);
            sessionStorage.setItem('google_ads_oauth_token_timestamp', String(Date.now()));
            localStorage.setItem('google_ads_oauth_token_broadcast', JSON.stringify({ token: token, time: Date.now() }));
          } catch (e) {}

          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({
                type: 'GOOGLE_ADS_OAUTH_SUCCESS',
                token: token
              }, '*');
            } catch (e) {}
            setTimeout(function() { window.close(); }, 500);
          } else {
            setTimeout(function() {
              window.location.href = '/';
            }, 800);
          }
        } else {
          if (statusEl) statusEl.textContent = 'Waiting for authorization response...';
        }
      }

      window.addEventListener('load', completeOAuth);
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        completeOAuth();
      }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
