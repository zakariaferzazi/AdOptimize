import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  queryLiveCampaigns,
  fetchStructuralEntities,
  getQuotaCooldownStatus,
  validateAndFormatCustomerId,
  StructuralCampaignEntity,
  StructuralKeywordEntity,
} from '@/lib/google-ads-api';
import { executeWithAutoTokenRetry, loadTokenData } from '@/lib/token-manager';
import {
  saveCampaignToFirestore,
  fetchUserCampaigns,
  saveKeywordToFirestore,
  fetchUserKeywords,
  saveSearchTermToFirestore,
  saveUserAccount,
  addAuditLogToFirestore,
} from '@/lib/firestore-service';
import { GoogleAdsAccount, Campaign, Keyword, SearchTerm, AuditLog, CampaignType } from '@/types/adoptimize';

/**
 * Optmyzr-Pattern Background Sync Worker
 *
 * Designed for automated background queue and cron jobs:
 * 1. Lightweight Structural Sync (runs every 15-30m):
 *    - Uses stored refresh_token silently to fetch entity structure (status, budget, names)
 *    - Diffs against Firestore state and persists any changes made directly in Google Ads
 *    - Conserves Developer Token Explorer quota by avoiding heavy metrics queries
 * 2. Deep Metrics Sync (runs every 6-12h or on manual demand):
 *    - Pulls 30-day historical metrics, timeframe segmentation, and search terms
 * 3. Graceful Quota Handling:
 *    - On HTTP 429, logs retry delay and pauses queue execution without disrupting cached UI
 */
async function processUserSync(
  userId: string,
  force = false,
  mode: 'structural' | 'full' = 'structural',
  incomingAccessToken?: string,
  incomingRefreshToken?: string,
  incomingCustomerId?: string
): Promise<{
  success: boolean;
  userId: string;
  customerId?: string;
  campaignsCount?: number;
  campaigns?: Campaign[];
  keywords?: Keyword[];
  searchTerms?: SearchTerm[];
  changesCount?: number;
  changesSummary?: string[];
  status: string;
  currency?: string;
  message: string;
  newAccessToken?: string;
  newRefreshToken?: string;
}> {
  try {
    const accountDocRef = doc(db, 'users', userId, 'accounts', 'primary');
    const accountSnap = await getDoc(accountDocRef);

    let account: GoogleAdsAccount | null = null;
    if (accountSnap.exists()) {
      account = accountSnap.data() as GoogleAdsAccount;
    }

    const rawCid = incomingCustomerId || account?.clientCustomerId;
    if (!rawCid || rawCid === 'Not Connected') {
      return {
        success: false,
        userId,
        status: 'NOT_CONNECTED',
        message: 'Google Ads account is not actively connected.',
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
      };
    }

    // Check if global or account quota cooldown is active (only block full heavy sync, allow fast structural sync)
    const quotaCooldown = getQuotaCooldownStatus();
    if (quotaCooldown && !force && mode !== 'structural') {
      const remainingSec = Math.max(1, Math.round((quotaCooldown.retryAfter - Date.now()) / 1000));
      console.warn(`[SyncWorker] Quota cooldown active for user ${userId} (${remainingSec}s remaining). Skipping heavy API query.`);
      const existing = await fetchUserCampaigns(userId);
      return {
        success: true,
        userId,
        customerId: cleanCid,
        campaigns: existing,
        campaignsCount: existing.length,
        status: 'QUOTA_PAUSED',
        message: `Google Ads rate limit cooldown active (~${Math.round(remainingSec / 60)}m remaining). Data preserved in database.`,
      };
    }

    // Load stored token data from token-manager / Firestore
    const storedToken = await loadTokenData({ userId, customerId: cleanCid });
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    // -------------------------------------------------------------
    // MODE 1: Fast Structural Diff & Sync (Lightweight, Low-Quota)
    // -------------------------------------------------------------
    if (mode === 'structural') {
      const structuralResult = await executeWithAutoTokenRetry(
        {
          userId,
          customerId: cleanCid,
          incomingAccessToken: incomingAccessToken || storedToken?.accessToken || account?.accessToken,
          incomingRefreshToken: incomingRefreshToken || storedToken?.refreshToken || account?.refreshToken,
          incomingExpiresAt: storedToken?.expiresAt,
          forceRefresh: force,
        },
        async (activeToken: string) => {
          return fetchStructuralEntities(cleanCid, activeToken, devToken, account?.loginCustomerId);
        }
      );

      if (structuralResult.isQuotaExhausted) {
        console.warn(`[SyncWorker] Quota exhausted during structural sync for user ${userId}. Preserving local Firestore state.`);
        return {
          success: true,
          userId,
          customerId: cleanCid,
          status: 'QUOTA_PAUSED',
          message: 'Google Ads quota reached. Serving verified Firestore cache.',
        };
      }

      if (structuralResult.success && Array.isArray(structuralResult.campaigns)) {
        const liveCampaigns: StructuralCampaignEntity[] = structuralResult.campaigns;
        const liveKeywords: StructuralKeywordEntity[] = structuralResult.keywords || [];
        const existingCampaigns = await fetchUserCampaigns(userId);
        const existingKeywords = await fetchUserKeywords(userId);

        let changesDetected = 0;
        const changesSummary: string[] = [];
        const syncTime = new Date().toISOString();

        // 1. Campaign structural diffing
        for (const liveCamp of liveCampaigns) {
          // Normalize comparison: check rawId, id, or numeric suffix
          const matchedExisting = existingCampaigns.find(
            (ec) =>
              ec.id === liveCamp.id ||
              ec.id.replace(/\D/g, '') === liveCamp.rawId ||
              ec.id === `camp-live-${liveCamp.rawId}` ||
              ec.id === `camp-${liveCamp.rawId}`
          );

          if (!matchedExisting) {
            // A brand-new campaign was created directly on Google Ads!
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
              accountId: account?.id || `acc-${cleanCid}`,
              name: liveCamp.name,
              type: safeType,
              status: liveCamp.status,
              budgetDaily: liveCamp.budgetDaily,
              spend: 0,
              impressions: 0,
              clicks: 0,
              ctr: 0,
              cpc: 0,
              conversions: 0,
              cpa: 0,
              conversionValue: 0,
              roas: 0,
              conversionRate: 0,
              healthStatus: 'HEALTHY',
              healthScore: 85,
              trendPoints: [],
              historicalPoints: [],
              keywordsCount: liveKeywords.filter((k) => k.campaignId === liveCamp.id).length,
              activeAdsCount: 1,
              primaryGoal: 'MAXIMIZE_CONVERSIONS',
              previousPeriod: { spend: 0, conversions: 0, cpa: 0, roas: 0 },
            };

            await saveCampaignToFirestore(userId, newCampaign);
            changesDetected++;
            changesSummary.push(`New campaign detected: "${liveCamp.name}" (${liveCamp.status}, $${liveCamp.budgetDaily}/day)`);

            await addAuditLogToFirestore(userId, {
              id: `audit-${Date.now()}-${liveCamp.rawId}`,
              timestamp: syncTime,
              campaignId: liveCamp.id,
              campaignName: liveCamp.name,
              actionType: 'CAMPAIGN_DETECTED',
              previousValue: 'None',
              newValue: `${liveCamp.status} ($${liveCamp.budgetDaily}/day)`,
              reason: 'New campaign detected directly on Google Ads and synchronized into AdOptimize.',
              source: 'GOOGLE_ADS_SYNC',
              userOrSystem: 'Auto-Sync Worker',
              status: 'EXECUTED',
              canRevert: false,
            });
          } else {
            // Existing campaign: check for status change, budget change, or rename
            let hasChanged = false;
            const updated: Campaign = { ...matchedExisting };

            // Status toggle check
            if (matchedExisting.status !== liveCamp.status) {
              hasChanged = true;
              const oldStatus = matchedExisting.status;
              updated.status = liveCamp.status;
              changesSummary.push(`Campaign "${liveCamp.name}" status: ${oldStatus} -> ${liveCamp.status}`);

              await addAuditLogToFirestore(userId, {
                id: `audit-${Date.now()}-status-${liveCamp.rawId}`,
                timestamp: syncTime,
                campaignId: matchedExisting.id,
                campaignName: liveCamp.name,
                actionType: 'STATUS_SYNCED',
                previousValue: oldStatus,
                newValue: liveCamp.status,
                reason: `Status changed to ${liveCamp.status} directly on Google Ads.`,
                source: 'GOOGLE_ADS_SYNC',
                userOrSystem: 'Google Ads',
                status: 'EXECUTED',
                canRevert: false,
              });
            }

            // Budget edit check
            if (Math.abs(matchedExisting.budgetDaily - liveCamp.budgetDaily) > 0.05) {
              hasChanged = true;
              const oldBudget = matchedExisting.budgetDaily;
              updated.budgetDaily = liveCamp.budgetDaily;
              changesSummary.push(`Campaign "${liveCamp.name}" daily budget: $${oldBudget} -> $${liveCamp.budgetDaily}`);

              await addAuditLogToFirestore(userId, {
                id: `audit-${Date.now()}-budget-${liveCamp.rawId}`,
                timestamp: syncTime,
                campaignId: matchedExisting.id,
                campaignName: liveCamp.name,
                actionType: 'BUDGET_SYNCED',
                previousValue: `$${oldBudget}/day`,
                newValue: `$${liveCamp.budgetDaily}/day`,
                reason: `Budget changed to $${liveCamp.budgetDaily}/day directly on Google Ads.`,
                source: 'GOOGLE_ADS_SYNC',
                userOrSystem: 'Google Ads',
                status: 'EXECUTED',
                canRevert: false,
              });
            }

            // Name edit check
            if (matchedExisting.name !== liveCamp.name) {
              hasChanged = true;
              const oldName = matchedExisting.name;
              updated.name = liveCamp.name;
              changesSummary.push(`Campaign renamed: "${oldName}" -> "${liveCamp.name}"`);
            }

            if (hasChanged) {
              changesDetected++;
              await saveCampaignToFirestore(userId, updated);
            }
          }
        }

        // 2. Keyword diffing (new keywords or status toggles)
        for (const liveKw of liveKeywords) {
          const matchedKw = existingKeywords.find(
            (ek) =>
              ek.id === liveKw.id ||
              (ek.keyword.toLowerCase().trim() === liveKw.keyword.toLowerCase().trim() &&
                ek.campaignName === liveKw.campaignName)
          );

          if (!matchedKw) {
            const newKeyword: Keyword = {
              id: liveKw.id,
              campaignId: liveKw.campaignId,
              campaignName: liveKw.campaignName,
              keyword: liveKw.keyword,
              matchType: liveKw.matchType,
              spend: 0,
              clicks: 0,
              impressions: 0,
              ctr: 0,
              cpc: 0,
              conversions: 0,
              cpa: 0,
              qualityScore: 7,
              status: liveKw.status,
              flag: 'NORMAL',
            };
            await saveKeywordToFirestore(userId, newKeyword);
            changesDetected++;
            changesSummary.push(`New keyword added: "${liveKw.keyword}" (${liveKw.campaignName})`);
          } else if (matchedKw.status !== liveKw.status) {
            await saveKeywordToFirestore(userId, {
              ...matchedKw,
              status: liveKw.status,
            });
            changesDetected++;
            changesSummary.push(`Keyword "${liveKw.keyword}" status: ${matchedKw.status} -> ${liveKw.status}`);
          }
        }

        // Update user account metadata
        await saveUserAccount(userId, {
          ...(account || {}),
          id: account?.id || `acc-${cleanCid}`,
          clientCustomerId: cleanCid,
          accountName: account?.accountName || 'Google Ads Account',
          timezone: account?.timezone || 'America/New_York (UTC-5)',
          isConnected: true,
          isDemo: false,
          lastSyncAt: syncTime,
          syncStatus: 'SYNCED',
          totalCampaignsCount: liveCampaigns.length,
          currency: structuralResult.currency || account?.currency || 'USD',
          ...(structuralResult.newAccessToken ? { accessToken: structuralResult.newAccessToken } : {}),
          ...(structuralResult.newRefreshToken ? { refreshToken: structuralResult.newRefreshToken } : {}),
        });

        console.log(`[SyncWorker:Structural] User ${userId} CID ${cleanCid}: ${changesDetected} changes detected.`);

        const finalCampaigns = await fetchUserCampaigns(userId);

        return {
          success: true,
          userId,
          customerId: cleanCid,
          campaignsCount: liveCampaigns.length,
          campaigns: finalCampaigns.length > 0 ? finalCampaigns : undefined,
          changesCount: changesDetected,
          changesSummary,
          status: 'SYNCED',
          currency: structuralResult.currency || account?.currency || 'USD',
          newAccessToken: structuralResult.newAccessToken,
          newRefreshToken: structuralResult.newRefreshToken,
          message:
            changesDetected > 0
              ? `Detected and synchronized ${changesDetected} live changes from Google Ads.`
              : 'Structural sync complete. Account is fully up to date.',
        };
      }

      return {
        success: false,
        userId,
        customerId: cleanCid,
        status: 'API_ERROR',
        message: structuralResult.error || 'Failed to fetch structural Google Ads entities.',
      };
    }

    // -------------------------------------------------------------
    // MODE 2: Deep Historical Metrics Sync (Periodic or Forced)
    // -------------------------------------------------------------
    const syncResult = await executeWithAutoTokenRetry(
      {
        userId,
        customerId: cleanCid,
        incomingAccessToken: incomingAccessToken || storedToken?.accessToken || account?.accessToken,
        incomingRefreshToken: incomingRefreshToken || storedToken?.refreshToken || account?.refreshToken,
        incomingExpiresAt: storedToken?.expiresAt,
        forceRefresh: force,
      },
      async (activeToken: string) => {
        return queryLiveCampaigns(cleanCid, activeToken, devToken, account?.loginCustomerId, { forceRefresh: force });
      }
    );

    if (syncResult.success && Array.isArray(syncResult.campaigns)) {
      const liveCampaigns: Campaign[] = syncResult.campaigns;
      const liveKeywords: Keyword[] = syncResult.keywords || [];
      const liveSearchTerms: SearchTerm[] = syncResult.searchTerms || [];
      const syncTime = new Date().toISOString();

      // Persist to user's Firestore collections in parallel
      const savePromises: Promise<any>[] = [
        ...liveCampaigns.map((c) => saveCampaignToFirestore(userId, c)),
        ...liveKeywords.map((k) => saveKeywordToFirestore(userId, k)),
        ...liveSearchTerms.map((st) => saveSearchTermToFirestore(userId, st)),
        saveUserAccount(userId, {
          ...(account || {}),
          id: account?.id || `acc-${cleanCid}`,
          clientCustomerId: cleanCid,
          accountName: account?.accountName || 'Google Ads Account',
          timezone: account?.timezone || 'America/New_York (UTC-5)',
          isConnected: true,
          isDemo: false,
          lastSyncAt: syncTime,
          syncStatus: 'SYNCED',
          totalCampaignsCount: liveCampaigns.length,
          currency: syncResult.currency || account?.currency || 'USD',
          ...(syncResult.newAccessToken ? { accessToken: syncResult.newAccessToken } : {}),
          ...(syncResult.newRefreshToken ? { refreshToken: syncResult.newRefreshToken } : {}),
        }),
      ];

      await Promise.allSettled(savePromises);

      console.log(`[SyncWorker:Full] Successfully synced ${liveCampaigns.length} campaigns for user ${userId} (CID: ${cleanCid})`);

      return {
        success: true,
        userId,
        customerId: cleanCid,
        campaignsCount: liveCampaigns.length,
        campaigns: liveCampaigns,
        keywords: liveKeywords,
        searchTerms: liveSearchTerms,
        status: 'SYNCED',
        currency: syncResult.currency || account?.currency || 'USD',
        newAccessToken: syncResult.newAccessToken,
        newRefreshToken: syncResult.newRefreshToken,
        message: `Successfully synchronized ${liveCampaigns.length} campaigns and metrics.`,
      };
    }

    if (syncResult.isQuotaExhausted) {
      console.warn(`[SyncWorker:Full] Quota exhausted for user ${userId}. Preserving local database state.`);
      const cached = await fetchUserCampaigns(userId);
      return {
        success: true,
        userId,
        customerId: cleanCid,
        campaigns: cached,
        campaignsCount: cached.length,
        status: 'QUOTA_PAUSED',
        message: 'Google Ads quota reached. Serving verified database cache.',
      };
    }

    return {
      success: false,
      userId,
      customerId: cleanCid,
      status: 'API_ERROR',
      message: syncResult.error || 'Failed to query live Google Ads campaigns.',
    };
  } catch (err: any) {
    console.error(`[SyncWorker] Error processing sync for user ${userId}:`, err);
    return {
      success: false,
      userId,
      status: 'INTERNAL_ERROR',
      message: err?.message || 'Internal worker execution error.',
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, customerId, accessToken, refreshToken, force = false, mode = 'structural' } = body;

    if (userId) {
      const result = await processUserSync(userId, force, mode, accessToken, refreshToken, customerId);
      return NextResponse.json(result);
    }

    // If no specific userId, query all active users from Firestore
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    const results = [];

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const res = await processUserSync(uid, force, mode);
      results.push(res);
      // Small 1.5s delay between account syncs to avoid bursting API quotas
      await new Promise((r) => setTimeout(r, 1500));
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      mode,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Background sync worker error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const force = url.searchParams.get('force') === 'true';
  const mode = (url.searchParams.get('mode') as 'structural' | 'full') || 'structural';

  if (userId) {
    const result = await processUserSync(userId, force, mode);
    return NextResponse.json(result);
  }

  return NextResponse.json({
    status: 'ACTIVE',
    worker: 'AdOptimize Background Sync Worker',
    pattern: 'Optmyzr Database-First & Silent Refresh',
    features: ['Lightweight Structural Diffing', 'Automated Token Rotation', 'Quota Protection'],
    usage: 'POST/GET with { userId?: string, force?: boolean, mode?: "structural" | "full" }',
  });
}
