import { NextResponse } from 'next/server';

export async function GET() {
  const clientId =
    process.env.GOOGLE_ADS_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID ||
    '1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg.apps.googleusercontent.com';

  return NextResponse.json({
    clientId,
    projectId: 'gen-lang-client-0289010496',
    appUrl: process.env.APP_URL || 'https://adoptimize.app',
    requiredOrigin: 'https://adoptimize.app',
    developerTokenConfigured: Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
  });
}
