import { NextRequest, NextResponse } from 'next/server';
import {
  queryLiveCampaigns,
  fetchStructuralEntities,
  getQuotaCooldownStatus,
  validateAndFormatCustomerId,
  StructuralCampaignEntity,
} from '@/lib/google-ads-api';
import { executeWithAutoTokenRetry, loadTokenData } from '@/lib/token-manager';
import { Campaign, CampaignType } from '@/types/adoptimize';

// Sync must always run live; never serve a statically cached response.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Optmyzr-Pattern Background Sync Worker
 *
 * Pure API proxy worker — performs zero server-side Firestore operations to respect
 * security rules (request.auth is client-only). All persistence happens in the client
 * where the user is authenticated.
 */
async function processUserSync(
  userId?: string,
  force = false,
  mode: 'structural' | 'full' = 'structural',
  incomingAccessToken?: string,
  incomingRefreshToken?: string,
  incomingCustomerId?: string,
  incomingCachedCampaigns?: Campaign[],
  loginCustomerId?: string
): Promise<{
  success: boolean;
  userId?: string;
  customerId?: string;
  campaignsCount?: number;
  campaigns?: Campaign[];
  keywords?: any[];
  searchTerms?: any[];
  changesCount?: number;
  changesSummary?: string[];
  status: string;
  /** ISO time the returned data was fetched from Google Ads. Only set when status === 'SYNCED'. */
  lastSyncAt?: string;
  /** True only when performance metrics (spend, clicks, conversions...) were refreshed from the API. */
  metricsRefreshed?: boolean;
  /** True when Google Ads data was served from the short-lived server cache. */
  fromCache?: boolean;
  retryDelaySeconds?: number;
  error?: string;
  currency?: string;
  timeZone?: string;
  accountName?: string;
  message: string;
  newAccessToken?: string;
  newRefreshToken?: string;
  newExpiresAt?: number;
}> {
  try {
    const rawCid = incomingCustomerId;
    if (!rawCid || rawCid === 'Not Connected') {
      return {
        success: false,
        userId,
        status: 'NOT_CONNECTED',
        message: 'Google Ads account is not actively connected.',
        campaigns: incomingCachedCampaigns || [],
      };
    }

    const validation = validateAndFormatCustomerId(rawCid);
    const cleanCid = validation.isValid ? validation.clean : rawCid.replace(/\D/g, '');

    if (!cleanCid || cleanCid.length !== 10) {
      return {
        success: false,
        userId,
        status: 'INVALID_CID',
        message: `Invalid 10-digit Customer ID: ${rawCid}`,
        campaigns: incomingCachedCampaigns || [],
      };
    }

    const existingCampaigns = Array.isArray(incomingCachedCampaigns) ? incomingCachedCampaigns : [];

    // Check if quota cooldown is active (only block full heavy sync, allow fast structural sync)
    const quotaCooldown = getQuotaCooldownStatus();
    if (quotaCooldown && !force && mode !== 'structural') {
      const remainingSec = Math.max(1, Math.round((quotaCooldown.retryAfter - Date.now()) / 1000));
      return {
        success: false,
        retryDelaySeconds: remainingSec,
        userId,
        customerId: cleanCid,
        campaigns: existingCampaigns,
        campaignsCount: existingCampaigns.length,
        status: 'QUOTA_PAUSED',
        message: `Google Ads rate limit cooldown active (~${Math.round(remainingSec / 60)}m remaining). Data preserved in database.`,
      };
    }

    // Try loading stored token data if userId is provided
    let storedToken = null;
    if (userId) {
      try {
        storedToken = await loadTokenData({ userId, customerId: cleanCid });
      } catch {}
    }

    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    // -------------------------------------------------------------
    // MODE 1: Fast Structural Diff & Sync (Lightweight, 1 Operation)
    // -------------------------------------------------------------
    if (mode === 'structural') {
      const structuralResult = await executeWithAutoTokenRetry(
        {
          userId,
          customerId: cleanCid,
          incomingAccessToken: incomingAccessToken || storedToken?.accessToken,
          incomingRefreshToken: incomingRefreshToken || storedToken?.refreshToken,
          incomingExpiresAt: storedToken?.expiresAt,
          forceRefresh: force,
        },
        async (activeToken: string) => {
          return fetchStructuralEntities(cleanCid, activeToken, devToken, loginCustomerId);
        }
      );

      if (structuralResult.isQuotaExhausted) {
        return {
          success: false,
          retryDelaySeconds: structuralResult.retryDelaySeconds,
          userId,
          customerId: cleanCid,
          campaigns: existingCampaigns,
          campaignsCount: existingCampaigns.length,
          status: 'QUOTA_PAUSED',
          message: 'Google Ads quota cooling down. Serving verified cache.',
        };
      }

      if (structuralResult.success && Array.isArray(structuralResult.campaigns)) {
        const liveCampaigns: StructuralCampaignEntity[] = structuralResult.campaigns;
        let changesDetected = 0;
        const changesSummary: string[] = [];

        // Build merged campaign array
        const finalCampaigns: Campaign[] = [];
        const seenIds = new Set<string>();

        // 1. Update existing campaigns or add new campaigns from Google Ads
        for (const liveCamp of liveCampaigns) {
          const matchedExisting = existingCampaigns.find(
            (ec) =>
              ec.id === liveCamp.id ||
              ec.id.replace(/\D/g, '') === liveCamp.rawId ||
              ec.id === `camp-live-${liveCamp.rawId}` ||
              ec.id === `camp-${liveCamp.rawId}` ||
              ec.name.toLowerCase() === liveCamp.name.toLowerCase()
          );

          if (!matchedExisting) {
            // New campaign created in Google Ads!
            const rawType = String(liveCamp.type || 'SEARCH').toUpperCase();
            const safeType: CampaignType = rawType.includes('MAX')
              ? 'PERFORMANCE_MAX'
              : rawType.includes('DISPLAY')
              ? 'DISPLAY'
              : rawType.includes('SHOPPING')
              ? 'SHOPPING'
              : 'SEARCH';

            const newCampaign: Campaign = {
              id: liveCamp.id,
              accountId: `acc-${cleanCid}`,
              name: liveCamp.name,
              type: safeType,
              status: liveCamp.status,
              budgetDaily: liveCamp.budgetDaily,
              spend: 0,
              impressions: 0,
              clicks: 0,
              conversions: 0,
              conversionValue: 0,
              cpa: 0,
              roas: 0,
              ctr: 0,
              cpc: 0,
              conversionRate: 0,
              healthScore: 92,
              healthStatus: 'HEALTHY',
              trendPoints: [0, 0, 0, 0, 0, 0, 0],
              keywordsCount: 5,
              activeAdsCount: 1,
              historicalPoints: [],
              previousPeriod: { spend: 0, conversions: 0, cpa: 0, roas: 0 },
            };

            changesDetected++;
            changesSummary.push(`Added new campaign "${liveCamp.name}" from Google Ads`);
            finalCampaigns.push(newCampaign);
            seenIds.add(newCampaign.id);
          } else {
            // Campaign already exists; update live status and budget
            let updated = { ...matchedExisting };
            let hasChange = false;

            if (matchedExisting.status !== liveCamp.status) {
              updated.status = liveCamp.status;
              hasChange = true;
              changesSummary.push(`"${liveCamp.name}" status updated to ${liveCamp.status}`);
            }

            if (Math.abs(matchedExisting.budgetDaily - liveCamp.budgetDaily) >= 0.05 && liveCamp.budgetDaily > 0) {
              updated.budgetDaily = liveCamp.budgetDaily;
              hasChange = true;
              changesSummary.push(`"${liveCamp.name}" daily budget updated to $${liveCamp.budgetDaily.toFixed(2)}`);
            }

            if (matchedExisting.name !== liveCamp.name && liveCamp.name) {
              updated.name = liveCamp.name;
              hasChange = true;
            }

            if (hasChange) {
              changesDetected++;
            }

            finalCampaigns.push(updated);
            seenIds.add(updated.id);
            if (matchedExisting.id) seenIds.add(matchedExisting.id);
          }
        }

        // 2. Keep any existing campaigns not touched
        for (const ec of existingCampaigns) {
          if (!seenIds.has(ec.id)) {
            finalCampaigns.push(ec);
            seenIds.add(ec.id);
          }
        }

        return {
          success: true,
          userId,
          customerId: cleanCid,
          campaignsCount: finalCampaigns.length,
          campaigns: finalCampaigns,
          changesCount: changesDetected,
          changesSummary,
          status: 'SYNCED',
          lastSyncAt: new Date().toISOString(),
          metricsRefreshed: false,
          currency: structuralResult.currency || 'USD',
          message:
            changesDetected > 0
              ? `Synchronized ${changesDetected} live changes from Google Ads.`
              : 'Google Ads campaigns are fully synchronized and up-to-date.',
          newAccessToken: structuralResult.newAccessToken,
          newRefreshToken: structuralResult.newRefreshToken,
          newExpiresAt: structuralResult.newExpiresAt,
        };
      }

      // Structural query failed: report the failure honestly so the client keeps its
      // previous "last synced" time instead of stamping stale data as fresh.
      return {
        success: false,
        userId,
        customerId: cleanCid,
        campaigns: existingCampaigns,
        campaignsCount: existingCampaigns.length,
        status: structuralResult.isAuthExpired ? 'AUTH_EXPIRED' : 'ERROR',
        error: structuralResult.error,
        message: 'Google Ads sync failed. Showing previously synced data.',
      };
    }

    // -------------------------------------------------------------
    // MODE 2: Deep Historical Metrics Sync
    // -------------------------------------------------------------
    const syncResult = await executeWithAutoTokenRetry(
      {
        userId,
        customerId: cleanCid,
        incomingAccessToken: incomingAccessToken || storedToken?.accessToken,
        incomingRefreshToken: incomingRefreshToken || storedToken?.refreshToken,
        incomingExpiresAt: storedToken?.expiresAt,
        forceRefresh: force,
      },
      async (activeToken: string) => {
        return queryLiveCampaigns(cleanCid, activeToken, devToken, loginCustomerId, { forceRefresh: force });
      }
    );

    if (syncResult.success && !syncResult.isQuotaExhausted && Array.isArray(syncResult.campaigns)) {
      return {
        success: true,
        lastSyncAt: syncResult.fetchedAt || new Date().toISOString(),
        metricsRefreshed: true,
        fromCache: Boolean(syncResult.fromCache),
        userId,
        customerId: cleanCid,
        campaignsCount: syncResult.campaigns.length,
        campaigns: syncResult.campaigns,
        keywords: syncResult.keywords || [],
        searchTerms: syncResult.searchTerms || [],
        status: 'SYNCED',
        currency: syncResult.currency || 'USD',
        timeZone: syncResult.timeZone,
        accountName: syncResult.accountName,
        message: `Successfully synchronized ${syncResult.campaigns.length} campaigns from Google Ads.`,
        newAccessToken: syncResult.newAccessToken,
        newRefreshToken: syncResult.newRefreshToken,
        newExpiresAt: syncResult.newExpiresAt,
      };
    }

    if (syncResult.isQuotaExhausted) {
      return {
        success: false,
        userId,
        customerId: cleanCid,
        campaigns: existingCampaigns,
        campaignsCount: existingCampaigns.length,
        status: 'QUOTA_PAUSED',
        retryDelaySeconds: syncResult.retryDelaySeconds,
        message: 'Google Ads quota cooling down. Showing previously synced data.',
        newAccessToken: syncResult.newAccessToken,
        newRefreshToken: syncResult.newRefreshToken,
        newExpiresAt: syncResult.newExpiresAt,
      };
    }

    return {
      success: false,
      userId,
      customerId: cleanCid,
      campaigns: existingCampaigns,
      campaignsCount: existingCampaigns.length,
      status: syncResult.isAuthExpired || syncResult.statusCode === 401 ? 'AUTH_EXPIRED' : 'ERROR',
      error: syncResult.error,
      message: syncResult.error
        ? `Google Ads sync failed: ${String(syncResult.error).slice(0, 200)}`
        : 'Google Ads sync failed. Showing previously synced data.',
      newAccessToken: syncResult.newAccessToken,
      newRefreshToken: syncResult.newRefreshToken,
      newExpiresAt: syncResult.newExpiresAt,
    };
  } catch (err: any) {
    console.warn(`[SyncWorker] Handled exception for user ${userId}:`, err?.message);
    return {
      success: false,
      userId,
      status: 'FALLBACK',
      message: 'Preserving current campaign data.',
      campaigns: incomingCachedCampaigns || [],
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      userId,
      customerId,
      accessToken,
      refreshToken,
      force = false,
      mode = 'structural',
      cachedCampaigns = [],
      loginCustomerId,
    } = body;

    const result = await processUserSync(
      userId,
      force,
      mode,
      accessToken,
      refreshToken,
      customerId,
      cachedCampaigns,
      loginCustomerId
    );
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      status: 'FALLBACK',
      message: 'Preserving cached data.',
      campaigns: [],
    });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || undefined;
  const customerId = url.searchParams.get('customerId') || undefined;
  const force = url.searchParams.get('force') === 'true';
  const mode = (url.searchParams.get('mode') as 'structural' | 'full') || 'structural';

  if (customerId) {
    const result = await processUserSync(userId, force, mode, undefined, undefined, customerId);
    return NextResponse.json(result);
  }

  return NextResponse.json({
    status: 'ACTIVE',
    worker: 'AdOptimize Background Sync Worker',
    pattern: 'Optmyzr Database-First & Silent Refresh',
    features: ['Lightweight Structural Diffing', 'Automated Token Rotation', 'Quota Protection'],
  });
}
