import { NextRequest, NextResponse } from 'next/server';
import {
  validateAndFormatCustomerId,
  queryLiveCampaigns,
  getQuotaCooldownStatus,
  resetQuotaCooldown,
} from '@/lib/google-ads-api';
import { executeWithAutoTokenRetry } from '@/lib/token-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      accessToken,
      refreshToken,
      expiresAt,
      userId,
      userEmail,
      loginCustomerId,
      developerToken,
      forceRefresh = false,
      cachedCampaigns = [],
      cachedKeywords = [],
      cachedSearchTerms = [],
    } = body;

    const validation = validateAndFormatCustomerId(customerId || '');
    const cleanCid = validation.isValid ? validation.clean : String(customerId || '').replace(/\D/g, '');
    const formattedCid = validation.isValid ? validation.formatted : customerId;
    const syncTimestamp = new Date().toISOString();

    if (!cleanCid || cleanCid.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid Customer ID: "${customerId}". Google Ads Customer IDs must be exactly 10 digits.`,
        },
        { status: 400 }
      );
    }

    const devToken = developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    // If user explicitly triggers a forced refresh, clear any active cooldown
    if (forceRefresh) {
      resetQuotaCooldown();
    }

    // Check if Developer Token explorer quota is currently in cooldown period
    const quotaCooldown = getQuotaCooldownStatus();
    if (quotaCooldown) {
      const remainingSec = Math.max(1, Math.round((quotaCooldown.retryAfter - Date.now()) / 1000));
      const durationLabel =
        remainingSec >= 3600
          ? `~${(remainingSec / 3600).toFixed(1)}h`
          : remainingSec >= 60
          ? `~${Math.round(remainingSec / 60)}m`
          : `${remainingSec}s`;
      const quotaMsg = `Google Ads rate limit cooldown active (${durationLabel} remaining). Campaigns are preserved from cache.`;

      console.warn(`[Sync API] Quota cooldown active until ${new Date(quotaCooldown.retryAfter).toLocaleTimeString()} (${remainingSec}s remaining). Serving cached data.`);

      let fallbackCamps = Array.isArray(cachedCampaigns) && cachedCampaigns.length > 0 ? cachedCampaigns : [];
      let fallbackKeys = Array.isArray(cachedKeywords) && cachedKeywords.length > 0 ? cachedKeywords : [];
      let fallbackTerms = Array.isArray(cachedSearchTerms) && cachedSearchTerms.length > 0 ? cachedSearchTerms : [];

      if (fallbackCamps.length === 0 && userId) {
        try {
          const { fetchUserCampaigns, fetchUserKeywords, fetchUserSearchTerms } = await import('@/lib/firestore-service');
          const [camps, keys, terms] = await Promise.all([
            fetchUserCampaigns(userId),
            fetchUserKeywords(userId),
            fetchUserSearchTerms(userId),
          ]);
          if (camps.length > 0) fallbackCamps = camps;
          if (keys.length > 0) fallbackKeys = keys;
          if (terms.length > 0) fallbackTerms = terms;
        } catch (dbErr) {
          console.warn('[Sync API] Could not load database campaigns during quota cooldown:', dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        lastSyncAt: syncTimestamp,
        syncStatus: 'QUOTA_PAUSED',
        isLiveApi: false,
        isQuotaExhausted: true,
        retryDelaySeconds: remainingSec,
        quotaResetTime: quotaCooldown.retryAfter,
        message: quotaMsg,
        campaigns: fallbackCamps,
        keywords: fallbackKeys,
        searchTerms: fallbackTerms,
      });
    }

    // Execute with automated token refresh & 401 automatic retry
    const liveResult = await executeWithAutoTokenRetry(
      {
        userId,
        userEmail,
        customerId: cleanCid,
        incomingAccessToken: accessToken,
        incomingRefreshToken: refreshToken,
        incomingExpiresAt: expiresAt ? Number(expiresAt) : undefined,
        forceRefresh,
      },
      async (activeToken: string) => {
        return queryLiveCampaigns(cleanCid, activeToken, devToken, loginCustomerId, { forceRefresh });
      }
    );

    if (liveResult.success) {
      const realCampaigns = liveResult.campaigns || [];
      const realKeywords = liveResult.keywords || [];
      const realSearchTerms = liveResult.searchTerms || [];

      return NextResponse.json({
        success: true,
        lastSyncAt: syncTimestamp,
        syncStatus: 'SYNCED',
        isLiveApi: !liveResult.fromCache,
        fromCache: Boolean(liveResult.fromCache),
        freshness: liveResult.fromCache ? 'Served from 30-second request cache' : 'Live data from Google Ads',
        campaignsCount: realCampaigns.length,
        loginCustomerIdUsed: liveResult.loginCustomerIdUsed,
        currency: liveResult.currency,
        message: realCampaigns.length > 0
          ? `Successfully synchronized ${realCampaigns.length} live campaigns from Google Ads for account ${formattedCid}.`
          : `Google Ads account ${formattedCid} is connected. No campaigns found in this account.`,
        campaigns: realCampaigns,
        keywords: realKeywords,
        searchTerms: realSearchTerms,
        newAccessToken: liveResult.newAccessToken,
        newRefreshToken: liveResult.newRefreshToken,
        newExpiresAt: liveResult.newExpiresAt,
      });
    }

    // If Google Ads Developer Explorer daily rate limit / quota is exhausted (HTTP 429 / RESOURCE_EXHAUSTED):
    // Do NOT wipe campaigns or mark token expired. Maintain uninterrupted session and serve verified cache.
    if (liveResult.isQuotaExhausted) {
      const delaySec = liveResult.retryDelaySeconds || 48430;
      const hoursRemaining = (delaySec / 3600).toFixed(1);
      const quotaMsg = `Google Ads Explorer rate limit reached (resets in ~${hoursRemaining}h). Campaigns and optimizations remain active on cached data.`;

      const fallbackCampaigns = liveResult.campaigns && liveResult.campaigns.length > 0
        ? liveResult.campaigns
        : (Array.isArray(cachedCampaigns) ? cachedCampaigns : []);
      const fallbackKeywords = liveResult.keywords && liveResult.keywords.length > 0
        ? liveResult.keywords
        : (Array.isArray(cachedKeywords) ? cachedKeywords : []);
      const fallbackSearchTerms = liveResult.searchTerms && liveResult.searchTerms.length > 0
        ? liveResult.searchTerms
        : (Array.isArray(cachedSearchTerms) ? cachedSearchTerms : []);

      return NextResponse.json({
        success: true,
        lastSyncAt: syncTimestamp,
        syncStatus: 'QUOTA_PAUSED',
        isLiveApi: false,
        isQuotaExhausted: true,
        retryDelaySeconds: delaySec,
        quotaResetTime: Date.now() + delaySec * 1000,
        message: quotaMsg,
        campaigns: fallbackCampaigns,
        keywords: fallbackKeywords,
        searchTerms: fallbackSearchTerms,
        newAccessToken: liveResult.newAccessToken,
        newRefreshToken: liveResult.newRefreshToken,
        newExpiresAt: liveResult.newExpiresAt,
      });
    }

    // If query failed due to authentication after auto-retry was attempted
    if (liveResult.statusCode === 401 || liveResult.isAuthExpired) {
      return NextResponse.json(
        {
          success: false,
          lastSyncAt: syncTimestamp,
          syncStatus: 'AUTH_EXPIRED',
          isAuthExpired: true,
          statusCode: 401,
          error: liveResult.error || 'Google Ads session requires re-authentication. Please sign in with Google.',
          message: 'Google Ads session requires re-authentication. Please sign in with Google.',
          campaigns: Array.isArray(cachedCampaigns) ? cachedCampaigns : [],
        },
        { status: 401 }
      );
    }

    // Google Ads returned another API error: format cleanly
    const cleanErr = (liveResult.error || 'Google Ads query failed')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);

    return NextResponse.json(
      {
        success: false,
        lastSyncAt: syncTimestamp,
        syncStatus: 'ERROR',
        isLiveApi: false,
        apiError: cleanErr,
        error: cleanErr,
        details: liveResult.details,
        statusCode: liveResult.statusCode || 400,
        isAuthExpired: false,
        cid: formattedCid,
        accessibleCustomers: liveResult.accessibleCustomers || [],
        message: `Google Ads notice for account ${formattedCid}: ${cleanErr}`,
        campaigns: Array.isArray(cachedCampaigns) ? cachedCampaigns : [],
        newAccessToken: liveResult.newAccessToken,
        newRefreshToken: liveResult.newRefreshToken,
        newExpiresAt: liveResult.newExpiresAt,
      },
      { status: liveResult.statusCode && liveResult.statusCode >= 400 ? liveResult.statusCode : 400 }
    );
  } catch (err: any) {
    console.error('Error in /api/google-ads/sync:', err);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
