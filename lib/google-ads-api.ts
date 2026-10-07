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

/**
 * Calls Google Ads API to list accessible customers for the user's OAuth access token.
 */
export async function listAccessibleCustomers(accessToken: string, developerToken?: string): Promise<GoogleAdsApiResult> {
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (developerToken) {
      headers['developer-token'] = developerToken;
    }

    const res = await fetch('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
      method: 'GET',
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `Google Ads API Error (HTTP ${res.status})`;
      return {
        success: false,
        error: errMsg,
        details: JSON.stringify(data?.error?.details || data?.error || {}),
        statusCode: res.status,
      };
    }

    const resourceNames: string[] = data.resourceNames || [];
    const customerIds = resourceNames.map((r: string) => {
      const raw = r.replace('customers/', '');
      return raw.length === 10 ? `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}` : raw;
    });

    return {
      success: true,
      customers: customerIds,
    };
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
  developerToken?: string
): Promise<GoogleAdsApiResult> {
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (developerToken) {
      headers['developer-token'] = developerToken;
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
      LIMIT 50
    `;

    const res = await fetch(`https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:searchStream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: gaqlQuery }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || data?.[0]?.error?.message || `Google Ads API Error (HTTP ${res.status})`;
      return {
        success: false,
        error: errMsg,
        details: JSON.stringify(data?.error || data || {}),
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
        if (camp.advertisingChannelType === 'PERFORMANCE_MAX') channelType = 'PERFORMANCE_MAX';
        if (camp.advertisingChannelType === 'DISPLAY') channelType = 'DISPLAY';
        if (camp.advertisingChannelType === 'SHOPPING') channelType = 'SHOPPING';

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
        });
      }
    }

    return {
      success: true,
      campaigns: parsedCampaigns,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error querying Google Ads SearchStream API',
    };
  }
}
