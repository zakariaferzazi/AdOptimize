/**
 * Google Ads API Integration Module
 * Handles official Google Ads API v17 endpoints with real OAuth tokens and Customer IDs.
 */

export interface GoogleAdsApiResult {
  success: boolean;
  customers?: string[];
  campaigns?: any[];
  error?: string;
  details?: string;
  statusCode?: number;
}

/**
 * Validates a Google Ads Customer ID (CID).
 * Google Ads Customer IDs are always exactly 10 digits (e.g. 123-456-7890 or 1234567890).
 */
export function validateAndFormatCustomerId(rawId: string): { isValid: boolean; formatted: string; clean: string; error?: string } {
  if (!rawId || typeof rawId !== 'string') {
    return { isValid: false, formatted: '', clean: '', error: 'Customer ID is required.' };
  }

  const clean = rawId.replace(/\D/g, '');

  if (clean.length !== 10) {
    return {
      isValid: false,
      formatted: rawId,
      clean,
      error: `Invalid Google Ads Customer ID: "${rawId}". Google Ads CIDs must contain exactly 10 digits (e.g. 123-456-7890). Found ${clean.length} digits.`,
    };
  }

  // Must not be all zeros or dummy values
  if (/^0{10}$/.test(clean) || clean === '1234567890') {
    return {
      isValid: false,
      formatted: `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`,
      clean,
      error: 'Please enter your actual 10-digit Google Ads Customer ID from ads.google.com, not a placeholder.',
    };
  }

  const formatted = `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  return { isValid: true, formatted, clean };
}

const GOOGLE_ADS_API_VERSIONS = ['v25', 'v24', 'v23', 'v22'];

/**
 * Safely parses response body into JSON, preventing SyntaxError: Unexpected token '<'
 */
async function safeParseResponse(res: Response): Promise<{ isJson: boolean; data: any; rawText: string }> {
  try {
    const rawText = await res.text();
    try {
      const data = JSON.parse(rawText);
      return { isJson: true, data, rawText };
    } catch {
      return { isJson: false, data: null, rawText };
    }
  } catch (err: any) {
    return { isJson: false, data: null, rawText: err.message || '' };
  }
}

function cleanHtmlSnippet(raw: string): string {
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function extractGoogleAdsError(data: any, status: number, rawText: string): { error: string; details?: string } {
  if (data?.error) {
    const mainMsg = data.error.message || data.error.status;
    let detailMsg = '';
    let errorCodeStr = '';

    if (Array.isArray(data.error.details)) {
      for (const item of data.error.details) {
        if (Array.isArray(item.errors) && item.errors.length > 0) {
          const firstErr = item.errors[0];
          if (firstErr.message) detailMsg = firstErr.message;
          if (firstErr.errorCode) {
            const keys = Object.keys(firstErr.errorCode);
            if (keys.length > 0) {
              errorCodeStr = `${keys[0]}: ${firstErr.errorCode[keys[0]]}`;
            }
          }
        }
      }
    }

    const message = detailMsg || mainMsg || `Google Ads API Error (HTTP ${status})`;
    return {
      error: errorCodeStr ? `${message} (${errorCodeStr})` : message,
      details: data.error.details ? JSON.stringify(data.error.details) : undefined,
    };
  }

  if (Array.isArray(data) && data[0]?.error) {
    return {
      error: data[0].error.message || `Google Ads API Error (HTTP ${status})`,
      details: JSON.stringify(data[0].error),
    };
  }

  const cleanSnippet = cleanHtmlSnippet(rawText);
  if (status === 404) {
    return {
      error: `Google Ads API returned HTTP 404 (Not Found): Customer ID does not exist or endpoint was not found.`,
      details: cleanSnippet || undefined,
    };
  }

  return {
    error: `Google Ads API returned HTTP ${status}: ${cleanSnippet || 'No response body'}`,
    details: cleanSnippet || undefined,
  };
}

/**
 * Calls Google Ads API to list accessible customers for the user's OAuth access token.
 */
export async function listAccessibleCustomers(
  accessToken: string,
  developerToken?: string,
  loginCustomerId?: string
): Promise<GoogleAdsApiResult> {
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (developerToken) {
      headers['developer-token'] = developerToken;
    }

    if (loginCustomerId) {
      headers['login-customer-id'] = loginCustomerId.replace(/\D/g, '');
    }

    let lastError: GoogleAdsApiResult = {
      success: false,
      error: 'Failed to connect to Google Ads API',
    };

    for (const version of GOOGLE_ADS_API_VERSIONS) {
      const res = await fetch(`https://googleads.googleapis.com/${version}/customers:listAccessibleCustomers`, {
        method: 'GET',
        headers,
      });

      const parsed = await safeParseResponse(res);

      if (res.status === 404) {
        // Try next version if available
        lastError = {
          success: false,
          error: `Google Ads API endpoint (${version}) not found (HTTP 404)`,
          statusCode: 404,
        };
        continue;
      }

      if (!parsed.isJson) {
        const errInfo = extractGoogleAdsError(null, res.status, parsed.rawText);
        return {
          success: false,
          error: errInfo.error,
          details: errInfo.details,
          statusCode: res.status,
        };
      }

      const data = parsed.data;

      if (!res.ok) {
        const errInfo = extractGoogleAdsError(data, res.status, parsed.rawText);
        return {
          success: false,
          error: errInfo.error,
          details: errInfo.details,
          statusCode: res.status,
        };
      }

      const resourceNames: string[] = data?.resourceNames || [];
      const customerIds = resourceNames.map((r: string) => {
        const raw = r.replace('customers/', '');
        return raw.length === 10 ? `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}` : raw;
      });

      return {
        success: true,
        customers: customerIds,
      };
    }

    return lastError;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to connect to Google Ads API endpoint',
    };
  }
}

/**
 * Queries live campaigns for a verified Customer ID using Google Ads SearchStream API.
 */
export async function queryLiveCampaigns(
  cleanCustomerId: string,
  accessToken: string,
  developerToken?: string,
  loginCustomerId?: string
): Promise<GoogleAdsApiResult> {
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (developerToken) {
      headers['developer-token'] = developerToken;
    }

    if (loginCustomerId) {
      headers['login-customer-id'] = loginCustomerId.replace(/\D/g, '');
    }

    // Google Ads Query Language (GAQL)
    const gaqlQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 200
    `;

    let lastError: GoogleAdsApiResult = {
      success: false,
      error: 'Google Ads SearchStream query failed',
    };

    for (const version of GOOGLE_ADS_API_VERSIONS) {
      let res = await fetch(`https://googleads.googleapis.com/${version}/customers/${cleanCustomerId}/googleAds:searchStream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: gaqlQuery }),
      });

      // If 403 Permission Denied and login-customer-id wasn't set, try once with cleanCustomerId as login-customer-id
      if (res.status === 403 && !loginCustomerId) {
        const retryHeaders = {
          ...headers,
          'login-customer-id': cleanCustomerId,
        };
        const retryRes = await fetch(`https://googleads.googleapis.com/${version}/customers/${cleanCustomerId}/googleAds:searchStream`, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify({ query: gaqlQuery }),
        });
        if (retryRes.ok) {
          res = retryRes;
        }
      }

      const parsed = await safeParseResponse(res);

      if (res.status === 404) {
        // Version sunset or invalid, try next version
        lastError = {
          success: false,
          error: `Google Ads SearchStream API (${version}) returned HTTP 404 for CID ${cleanCustomerId}. Customer ID may not exist in Google Ads.`,
          statusCode: 404,
        };
        continue;
      }

      if (!parsed.isJson) {
        const errInfo = extractGoogleAdsError(null, res.status, parsed.rawText);
        return {
          success: false,
          error: errInfo.error,
          details: errInfo.details,
          statusCode: res.status,
        };
      }

      const data = parsed.data;

      if (!res.ok) {
        const errInfo = extractGoogleAdsError(data, res.status, parsed.rawText);
        return {
          success: false,
          error: errInfo.error,
          details: errInfo.details,
          statusCode: res.status,
        };
      }

      const parsedCampaigns: any[] = [];
      const resultsBatches = Array.isArray(data) ? data : [data];

      for (const batch of resultsBatches) {
        const results = batch.results || [];
        for (const row of results) {
          const camp = row.campaign || {};
          const metrics = row.metrics || {};
          const budget = row.campaignBudget || {};

          const spend = Number(((metrics.costMicros || 0) / 1_000_000).toFixed(2));
          const budgetDaily = Number(((budget.amountMicros || 0) / 1_000_000).toFixed(2));
          const clicks = Number(metrics.clicks || 0);
          const impressions = Number(metrics.impressions || 0);
          const conversions = Number(metrics.conversions || 0);
          const convValue = Number((metrics.conversionsValue || 0).toFixed(2));
          const cpa = conversions > 0 ? Number((spend / conversions).toFixed(2)) : spend;
          const roas = spend > 0 ? Number((convValue / spend).toFixed(2)) : 0;
          const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
          const cpc = clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0;

          let channelType = 'SEARCH';
          const rawType = (camp.advertisingChannelType || '').toUpperCase();
          if (rawType.includes('PERFORMANCE_MAX') || rawType.includes('PMAX')) channelType = 'PERFORMANCE_MAX';
          else if (rawType.includes('DISPLAY')) channelType = 'DISPLAY';
          else if (rawType.includes('SHOPPING')) channelType = 'SHOPPING';
          else if (rawType.includes('VIDEO')) channelType = 'VIDEO';
          else if (rawType.includes('DEMAND_GEN') || rawType.includes('DISCOVERY')) channelType = 'DEMAND_GEN';

          parsedCampaigns.push({
            id: `camp-live-${camp.id}`,
            accountId: `acc-${cleanCustomerId}`,
            name: camp.name || `Campaign ${camp.id}`,
            type: channelType,
            status: camp.status === 'ENABLED' ? 'ENABLED' : 'PAUSED',
            budgetDaily,
            spend,
            impressions,
            clicks,
            ctr,
            cpc,
            conversions,
            cpa,
            conversionValue: convValue,
            roas,
            conversionRate: clicks > 0 ? Number(((conversions / clicks) * 100).toFixed(2)) : 0,
            healthStatus: roas >= 3.5 ? 'HEALTHY' : cpa > 80 ? 'WARNING' : 'HEALTHY',
            healthScore: Math.min(99, Math.max(50, Math.round(roas * 18) + (camp.status === 'ENABLED' ? 20 : 0))),
            historicalPoints: [],
            trendPoints: [conversions, Math.round(conversions * 1.1), conversions],
            keywordsCount: 0,
            activeAdsCount: 0,
          });
        }
      }

      return {
        success: true,
        campaigns: parsedCampaigns,
      };
    }

    return lastError;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error querying Google Ads SearchStream API',
    };
  }
}

/**
 * Verifies if a specific customer ID is accessible by the authenticated user in Google Ads.
 */
export async function verifyCustomerAccess(
  cleanCustomerId: string,
  accessToken: string,
  developerToken?: string,
  loginCustomerId?: string,
  userEmail?: string
): Promise<{
  accessible: boolean;
  reason?: string;
  campaigns?: any[];
  statusCode?: number;
  details?: string;
  accessibleCustomers?: string[];
}> {
  const formattedCid = cleanCustomerId.length === 10
    ? `${cleanCustomerId.slice(0, 3)}-${cleanCustomerId.slice(3, 6)}-${cleanCustomerId.slice(6)}`
    : cleanCustomerId;

  // First, query live campaigns directly for this Customer ID
  const liveResult = await queryLiveCampaigns(cleanCustomerId, accessToken, developerToken, loginCustomerId);
  if (liveResult.success) {
    return {
      accessible: true,
      campaigns: liveResult.campaigns || [],
      statusCode: 200,
    };
  }

  // Second, check listAccessibleCustomers for direct access
  const listResult = await listAccessibleCustomers(accessToken, developerToken, loginCustomerId);
  const foundAccounts = listResult.customers || [];

  if (foundAccounts.length > 0) {
    const isDirectMatch = foundAccounts.some((c) => c.replace(/\D/g, '') === cleanCustomerId);
    if (isDirectMatch) {
      // It exists in listAccessibleCustomers! Try again with explicit login-customer-id
      const retryResult = await queryLiveCampaigns(cleanCustomerId, accessToken, developerToken, cleanCustomerId);
      if (retryResult.success) {
        return {
          accessible: true,
          campaigns: retryResult.campaigns || [],
          statusCode: 200,
        };
      }
      return {
        accessible: true,
        campaigns: retryResult.campaigns || [],
        reason: retryResult.error,
        statusCode: retryResult.statusCode || 200,
        details: retryResult.details,
        accessibleCustomers: foundAccounts,
      };
    }

    return {
      accessible: false,
      reason: `The caller does not have permission for CID ${formattedCid}. Your Google login (${userEmail || 'current user'}) has access to ${foundAccounts.length} account${foundAccounts.length > 1 ? 's' : ''}: ${foundAccounts.join(', ')}. Select one of your accessible accounts or grant access in ads.google.com.`,
      statusCode: 403,
      accessibleCustomers: foundAccounts,
      details: JSON.stringify({ accessibleAccounts: foundAccounts }),
    };
  }

  if (liveResult.statusCode === 403 || listResult.statusCode === 403) {
    return {
      accessible: false,
      reason: `The caller does not have permission: The authenticated Google account ${userEmail ? `(${userEmail})` : ''} does not have user access to CID ${formattedCid} in ads.google.com. Go to Tools & Settings → Access and Security in Google Ads to invite this email, or switch to the Google account that manages this CID.`,
      statusCode: 403,
      details: liveResult.details || listResult.details,
    };
  }

  return {
    accessible: false,
    reason: liveResult.error || listResult.error || `Customer ID ${formattedCid} not found or not accessible with this Google account.`,
    statusCode: liveResult.statusCode || listResult.statusCode || 400,
    details: liveResult.details || listResult.details,
  };
}
