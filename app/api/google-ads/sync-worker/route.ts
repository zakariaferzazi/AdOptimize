import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import {
  queryLiveCampaigns,
  getQuotaCooldownStatus,
  validateAndFormatCustomerId,
} from '@/lib/google-ads-api';
import { executeWithAutoTokenRetry, loadTokenData } from '@/lib/token-manager';
import {
  saveCampaignToFirestore,
  saveKeywordToFirestore,
  saveSearchTermToFirestore,
  saveUserAccount,
  cleanForFirestore,
} from '@/lib/firestore-service';
import { GoogleAdsAccount, Campaign, Keyword, SearchTerm } from '@/types/adoptimize';

/**
 * Optmyzr-Pattern Background Sync Worker
 *
 * Designed for automated background queue and cron jobs (e.g., hourly incremental sync
 * or daily full refresh) without requiring any user session, browser interaction, or OAuth popups.
 * Uses stored refresh_token from Firestore to auto-rotate access tokens silently.
 */
async function processUserSync(userId: string, force = false): Promise<{
  success: boolean;
  userId: string;
  customerId?: string;
  campaignsCount?: number;
  status: string;
  message: string;
}> {
  try {
    const accountDocRef = doc(db, 'users', userId, 'accounts', 'primary');
    const accountSnap = await getDoc(accountDocRef);

    if (!accountSnap.exists()) {
      return {
        success: false,
        userId,
        status: 'NO_ACCOUNT',
        message: 'No primary Google Ads account found for user.',
      };
    }

    const account = accountSnap.data() as GoogleAdsAccount;
    if (!account.isConnected || !account.clientCustomerId || account.clientCustomerId === 'Not Connected') {
      return {
        success: false,
        userId,
        status: 'NOT_CONNECTED',
        message: 'Google Ads account is not actively connected.',
      };
    }

    const validation = validateAndFormatCustomerId(account.clientCustomerId);
    const cleanCid = validation.isValid ? validation.clean : account.clientCustomerId.replace(/\D/g, '');

    if (!cleanCid || cleanCid.length !== 10) {
      return {
        success: false,
        userId,
        status: 'INVALID_CID',
        message: `Invalid 10-digit Customer ID: ${account.clientCustomerId}`,
      };
    }

    // Check if global or account quota cooldown is active
    const quotaCooldown = getQuotaCooldownStatus();
    if (quotaCooldown && !force) {
      const remainingSec = Math.max(1, Math.round((quotaCooldown.retryAfter - Date.now()) / 1000));
      console.warn(`[SyncWorker] Quota cooldown active for user ${userId} (${remainingSec}s remaining). Skipping API query.`);
      return {
        success: true,
        userId,
        customerId: cleanCid,
        status: 'QUOTA_PAUSED',
        message: `Google Ads rate limit cooldown active (~${Math.round(remainingSec / 60)}m remaining). Data preserved in database.`,
      };
    }

    // Load stored token data from token-manager / Firestore
    const storedToken = await loadTokenData({ userId, customerId: cleanCid });
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    const syncResult = await executeWithAutoTokenRetry(
      {
        userId,
        customerId: cleanCid,
        incomingAccessToken: storedToken?.accessToken || account.accessToken,
        incomingRefreshToken: storedToken?.refreshToken || account.refreshToken,
        incomingExpiresAt: storedToken?.expiresAt,
        forceRefresh: force,
      },
      async (activeToken: string) => {
        return queryLiveCampaigns(cleanCid, activeToken, devToken, account.loginCustomerId, { forceRefresh: force });
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
          ...account,
          lastSyncAt: syncTime,
          syncStatus: 'SYNCED',
          totalCampaignsCount: liveCampaigns.length,
          currency: syncResult.currency || account.currency || 'USD',
          ...(syncResult.newAccessToken ? { accessToken: syncResult.newAccessToken } : {}),
          ...(syncResult.newRefreshToken ? { refreshToken: syncResult.newRefreshToken } : {}),
        }),
      ];

      await Promise.allSettled(savePromises);

      console.log(`[SyncWorker] Successfully synced ${liveCampaigns.length} campaigns for user ${userId} (CID: ${cleanCid})`);

      return {
        success: true,
        userId,
        customerId: cleanCid,
        campaignsCount: liveCampaigns.length,
        status: 'SYNCED',
        message: `Successfully synchronized ${liveCampaigns.length} campaigns.`,
      };
    }

    if (syncResult.isQuotaExhausted) {
      console.warn(`[SyncWorker] Quota exhausted for user ${userId}. Preserving local database state.`);
      return {
        success: true,
        userId,
        customerId: cleanCid,
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
    const { userId, force = false } = body;

    if (userId) {
      const result = await processUserSync(userId, force);
      return NextResponse.json(result);
    }

    // If no specific userId, query all active users from Firestore
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    const results = [];

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const res = await processUserSync(uid, force);
      results.push(res);
      // Small 1.5s delay between account syncs to avoid bursting API quotas
      await new Promise((r) => setTimeout(r, 1500));
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
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

  if (userId) {
    const result = await processUserSync(userId, force);
    return NextResponse.json(result);
  }

  return NextResponse.json({
    status: 'ACTIVE',
    worker: 'AdOptimize Background Sync Worker',
    pattern: 'Optmyzr Database-First & Silent Refresh',
    usage: 'POST with { userId?: string, force?: boolean } or GET ?userId=<uid>',
  });
}
