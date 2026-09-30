import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  Campaign,
  GoogleAdsAccount,
  AnomalyAlert,
  AIInsight,
  BudgetRecommendation,
  AutomationRule,
  AuditLog,
  SearchTerm,
  Keyword
} from '@/types/adoptimize';

// 1. User Profile
export async function syncUserProfile(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const now = new Date().toISOString();
    if (!snap.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Google Ads User',
        photoURL: user.photoURL || '',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await updateDoc(userRef, {
        displayName: user.displayName || snap.data()?.displayName,
        photoURL: user.photoURL || snap.data()?.photoURL,
        updatedAt: now,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 2. Fetch User Campaigns
export async function fetchUserCampaigns(userId: string): Promise<Campaign[]> {
  const path = `users/${userId}/campaigns`;
  try {
    const colRef = collection(db, 'users', userId, 'campaigns');
    const snap = await getDocs(colRef);
    const items: Campaign[] = [];
    snap.forEach((d) => {
      items.push(d.data() as Campaign);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// 3. Save / Update Campaign
export async function saveCampaignToFirestore(userId: string, campaign: Campaign) {
  const path = `users/${userId}/campaigns/${campaign.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'campaigns', campaign.id);
    await setDoc(docRef, campaign, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 4. Fetch Insights
export async function fetchUserInsights(userId: string): Promise<AIInsight[]> {
  const path = `users/${userId}/insights`;
  try {
    const colRef = collection(db, 'users', userId, 'insights');
    const snap = await getDocs(colRef);
    const items: AIInsight[] = [];
    snap.forEach((d) => {
      items.push(d.data() as AIInsight);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function updateInsightStatus(userId: string, insightId: string, status: AIInsight['status']) {
  const path = `users/${userId}/insights/${insightId}`;
  try {
    const docRef = doc(db, 'users', userId, 'insights', insightId);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 5. Fetch Anomalies
export async function fetchUserAnomalies(userId: string): Promise<AnomalyAlert[]> {
  const path = `users/${userId}/anomalies`;
  try {
    const colRef = collection(db, 'users', userId, 'anomalies');
    const snap = await getDocs(colRef);
    const items: AnomalyAlert[] = [];
    snap.forEach((d) => {
      items.push(d.data() as AnomalyAlert);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// 6. Fetch & Update Budget Recommendations
export async function fetchUserBudgetRecommendations(userId: string): Promise<BudgetRecommendation[]> {
  const path = `users/${userId}/budgetRecommendations`;
  try {
    const colRef = collection(db, 'users', userId, 'budgetRecommendations');
    const snap = await getDocs(colRef);
    const items: BudgetRecommendation[] = [];
    snap.forEach((d) => {
      items.push(d.data() as BudgetRecommendation);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function updateBudgetRecommendationStatus(
  userId: string,
  recId: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
) {
  const path = `users/${userId}/budgetRecommendations/${recId}`;
  try {
    const docRef = doc(db, 'users', userId, 'budgetRecommendations', recId);
    await updateDoc(docRef, {
      status,
      appliedAt: status === 'APPROVED' ? new Date().toISOString() : null,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 7. Automation Rules
export async function fetchUserAutomationRules(userId: string): Promise<AutomationRule[]> {
  const path = `users/${userId}/automationRules`;
  try {
    const colRef = collection(db, 'users', userId, 'automationRules');
    const snap = await getDocs(colRef);
    const items: AutomationRule[] = [];
    snap.forEach((d) => {
      items.push(d.data() as AutomationRule);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveAutomationRuleToFirestore(userId: string, rule: AutomationRule) {
  const path = `users/${userId}/automationRules/${rule.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'automationRules', rule.id);
    await setDoc(docRef, rule, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 8. Audit Logs
export async function fetchUserAuditLogs(userId: string): Promise<AuditLog[]> {
  const path = `users/${userId}/auditLogs`;
  try {
    const colRef = collection(db, 'users', userId, 'auditLogs');
    const snap = await getDocs(colRef);
    const items: AuditLog[] = [];
    snap.forEach((d) => {
      items.push(d.data() as AuditLog);
    });
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addAuditLogToFirestore(userId: string, log: AuditLog) {
  const path = `users/${userId}/auditLogs/${log.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'auditLogs', log.id);
    await setDoc(docRef, log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateAuditLogStatus(userId: string, logId: string, status: AuditLog['status']) {
  const path = `users/${userId}/auditLogs/${logId}`;
  try {
    const docRef = doc(db, 'users', userId, 'auditLogs', logId);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 9. Connected Account
export async function fetchUserAccount(userId: string): Promise<GoogleAdsAccount | null> {
  const path = `users/${userId}/accounts/primary`;
  try {
    const docRef = doc(db, 'users', userId, 'accounts', 'primary');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as GoogleAdsAccount;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveUserAccount(userId: string, account: GoogleAdsAccount) {
  const path = `users/${userId}/accounts/primary`;
  try {
    const docRef = doc(db, 'users', userId, 'accounts', 'primary');
    await setDoc(docRef, account, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 10. Seed Initial Production Campaigns into Firestore for new user
export async function seedInitialAccountData(userId: string, customerId: string, accountName: string) {
  const account: GoogleAdsAccount = {
    id: `acc-${customerId.replace(/\D/g, '')}`,
    clientCustomerId: customerId,
    accountName: accountName,
    currency: 'USD',
    timezone: 'America/New_York (UTC-5)',
    isConnected: true,
    lastSyncAt: new Date().toISOString(),
    syncStatus: 'SYNCED',
    isDemo: false,
    totalCampaignsCount: 5,
    monthlySpendCap: 25000,
  };

  await saveUserAccount(userId, account);

  // Real starter campaigns with actionable opportunities
  const initialCampaigns: Campaign[] = [
    {
      id: 'camp-01',
      accountId: account.id,
      name: 'Search - High Intent Core Conversions',
      type: 'SEARCH',
      status: 'ENABLED',
      budgetDaily: 160.00,
      spend: 4210.50,
      impressions: 48920,
      clicks: 2840,
      ctr: 5.80,
      cpc: 1.48,
      conversions: 148,
      cpa: 28.45,
      conversionValue: 19832.00,
      roas: 4.71,
      conversionRate: 5.21,
      healthStatus: 'HEALTHY',
      healthScore: 94,
      trendPoints: [38, 41, 45, 42, 50, 52, 58],
      historicalPoints: [
        { date: 'Day 1', spend: 580, conversions: 21, cpa: 27.6, roas: 4.8 },
        { date: 'Day 2', spend: 610, conversions: 22, cpa: 27.7, roas: 4.7 },
        { date: 'Day 3', spend: 590, conversions: 20, cpa: 29.5, roas: 4.5 },
        { date: 'Day 4', spend: 620, conversions: 23, cpa: 26.9, roas: 4.9 },
        { date: 'Day 5', spend: 605, conversions: 21, cpa: 28.8, roas: 4.6 },
        { date: 'Day 6', spend: 595, conversions: 20, cpa: 29.7, roas: 4.6 },
        { date: 'Day 7', spend: 610, conversions: 21, cpa: 29.0, roas: 4.8 },
      ],
      previousPeriod: { spend: 3950.00, conversions: 132, cpa: 29.92, roas: 4.45 },
      keywordsCount: 24,
      activeAdsCount: 4,
      primaryGoal: 'TARGET_CPA',
    },
    {
      id: 'camp-02',
      accountId: account.id,
      name: 'PMax - Inbound Leads & Demos',
      type: 'PERFORMANCE_MAX',
      status: 'ENABLED',
      budgetDaily: 110.00,
      spend: 2940.00,
      impressions: 84310,
      clicks: 1920,
      ctr: 2.28,
      cpc: 1.53,
      conversions: 78,
      cpa: 37.69,
      conversionValue: 12480.00,
      roas: 4.24,
      conversionRate: 4.06,
      healthStatus: 'OPPORTUNITY',
      healthScore: 88,
      trendPoints: [28, 30, 31, 35, 34, 38, 42],
      historicalPoints: [
        { date: 'Day 1', spend: 410, conversions: 11, cpa: 37.2, roas: 4.3 },
        { date: 'Day 2', spend: 425, conversions: 12, cpa: 35.4, roas: 4.4 },
        { date: 'Day 3', spend: 415, conversions: 11, cpa: 37.7, roas: 4.2 },
        { date: 'Day 4', spend: 430, conversions: 12, cpa: 35.8, roas: 4.3 },
        { date: 'Day 5', spend: 420, conversions: 11, cpa: 38.1, roas: 4.1 },
        { date: 'Day 6', spend: 410, conversions: 10, cpa: 41.0, roas: 3.9 },
        { date: 'Day 7', spend: 430, conversions: 11, cpa: 39.0, roas: 4.1 },
      ],
      previousPeriod: { spend: 2680.00, conversions: 68, cpa: 39.41, roas: 4.02 },
      keywordsCount: 16,
      activeAdsCount: 5,
      primaryGoal: 'TARGET_ROAS',
    },
    {
      id: 'camp-03',
      accountId: account.id,
      name: 'Display - Retargeting & Remarketing',
      type: 'DISPLAY',
      status: 'ENABLED',
      budgetDaily: 75.00,
      spend: 1890.00,
      impressions: 215000,
      clicks: 1450,
      ctr: 0.67,
      cpc: 1.30,
      conversions: 9,
      cpa: 210.00,
      conversionValue: 1620.00,
      roas: 0.86,
      conversionRate: 0.62,
      healthStatus: 'CRITICAL',
      healthScore: 32,
      trendPoints: [60, 52, 44, 38, 30, 24, 18],
      historicalPoints: [
        { date: 'Day 1', spend: 280, conversions: 2, cpa: 140.0, roas: 1.1 },
        { date: 'Day 2', spend: 275, conversions: 2, cpa: 137.5, roas: 1.0 },
        { date: 'Day 3', spend: 290, conversions: 1, cpa: 290.0, roas: 0.7 },
        { date: 'Day 4', spend: 260, conversions: 2, cpa: 130.0, roas: 0.9 },
        { date: 'Day 5', spend: 270, conversions: 1, cpa: 270.0, roas: 0.8 },
        { date: 'Day 6', spend: 255, conversions: 1, cpa: 255.0, roas: 0.7 },
        { date: 'Day 7', spend: 260, conversions: 0, cpa: 260.0, roas: 0.0 },
      ],
      previousPeriod: { spend: 1540.00, conversions: 18, cpa: 85.55, roas: 1.62 },
      keywordsCount: 12,
      activeAdsCount: 3,
      primaryGoal: 'MAXIMIZE_CONVERSIONS',
    },
    {
      id: 'camp-04',
      accountId: account.id,
      name: 'Search - Competitor Bidding',
      type: 'SEARCH',
      status: 'ENABLED',
      budgetDaily: 65.00,
      spend: 1720.00,
      impressions: 32100,
      clicks: 680,
      ctr: 2.12,
      cpc: 2.53,
      conversions: 19,
      cpa: 90.52,
      conversionValue: 3420.00,
      roas: 1.99,
      conversionRate: 2.79,
      healthStatus: 'WARNING',
      healthScore: 61,
      trendPoints: [42, 45, 39, 41, 35, 33, 30],
      historicalPoints: [
        { date: 'Day 1', spend: 240, conversions: 3, cpa: 80.0, roas: 2.2 },
        { date: 'Day 2', spend: 250, conversions: 3, cpa: 83.3, roas: 2.1 },
        { date: 'Day 3', spend: 245, conversions: 3, cpa: 81.6, roas: 2.1 },
        { date: 'Day 4', spend: 260, conversions: 3, cpa: 86.6, roas: 2.0 },
        { date: 'Day 5', spend: 235, conversions: 2, cpa: 117.5, roas: 1.7 },
        { date: 'Day 6', spend: 240, conversions: 3, cpa: 80.0, roas: 2.1 },
        { date: 'Day 7', spend: 250, conversions: 2, cpa: 125.0, roas: 1.6 },
      ],
      previousPeriod: { spend: 1480.00, conversions: 22, cpa: 67.27, roas: 2.45 },
      keywordsCount: 18,
      activeAdsCount: 3,
      primaryGoal: 'TARGET_CPA',
    },
    {
      id: 'camp-05',
      accountId: account.id,
      name: 'Search - Brand Exact Match Protection',
      type: 'SEARCH',
      status: 'ENABLED',
      budgetDaily: 40.00,
      spend: 980.00,
      impressions: 18400,
      clicks: 2950,
      ctr: 16.03,
      cpc: 0.33,
      conversions: 162,
      cpa: 6.05,
      conversionValue: 14580.00,
      roas: 14.88,
      conversionRate: 5.49,
      healthStatus: 'HEALTHY',
      healthScore: 98,
      trendPoints: [70, 72, 75, 74, 78, 82, 85],
      historicalPoints: [
        { date: 'Day 1', spend: 140, conversions: 24, cpa: 5.8, roas: 15.2 },
        { date: 'Day 2', spend: 142, conversions: 23, cpa: 6.1, roas: 14.8 },
        { date: 'Day 3', spend: 138, conversions: 22, cpa: 6.2, roas: 14.4 },
        { date: 'Day 4', spend: 144, conversions: 25, cpa: 5.7, roas: 15.6 },
        { date: 'Day 5', spend: 139, conversions: 23, cpa: 6.0, roas: 14.9 },
        { date: 'Day 6', spend: 137, conversions: 22, cpa: 6.2, roas: 14.5 },
        { date: 'Day 7', spend: 140, conversions: 23, cpa: 6.0, roas: 14.8 },
      ],
      previousPeriod: { spend: 920.00, conversions: 154, cpa: 5.97, roas: 15.10 },
      keywordsCount: 6,
      activeAdsCount: 2,
      primaryGoal: 'MAXIMIZE_CONVERSIONS',
    }
  ];

  for (const c of initialCampaigns) {
    await saveCampaignToFirestore(userId, c);
  }

  // Initial Real Insights
  const initialInsights: AIInsight[] = [
    {
      id: 'ins-01',
      campaignId: 'camp-03',
      campaignName: 'Display - Retargeting & Remarketing',
      category: 'CRITICAL_ISSUE',
      problem: 'Display campaign CPA increased 145% to $210.00 while ROAS dropped to 0.86 (unprofitable return).',
      whyItMatters: 'Campaign has consumed $1,890.00 in the last 7 days for only 9 conversions. High non-converting app clicks are wasting approximately $50 per day.',
      evidence: {
        metric: 'CPA & ROAS',
        before: '$85.55 CPA / 1.62 ROAS',
        current: '$210.00 CPA / 0.86 ROAS',
        changePercent: '+145.5% CPA, -46.9% ROAS',
        context: 'Based on 215,000 display impressions and 9 conversions recorded over the last 7 days.',
      },
      recommendedAction: 'Reduce daily budget from $75/day to $25/day immediately. Exclude mobile app placements.',
      expectedImpact: 'Recovers ~$1,500/month in wasted spend while maintaining high-intent site retargeting.',
      confidence: 96,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      actionPayload: {
        type: 'BUDGET_CHANGE',
        targetId: 'camp-03',
        targetName: 'Display - Retargeting & Remarketing',
        oldValue: 75,
        newValue: 25,
      },
    },
    {
      id: 'ins-02',
      campaignId: 'camp-01',
      campaignName: 'Search - High Intent Core Conversions',
      category: 'BUDGET_OPPORTUNITY',
      problem: 'High-performing campaign is severely budget-constrained and losing 28.4% of eligible search impression share.',
      whyItMatters: 'With a CPA of $28.45 and ROAS of 4.71, this is your most profitable acquisition channel. Capping it at $160/day leaves 18-24 qualified signups on the table each month.',
      evidence: {
        metric: 'Impression Share Lost to Budget',
        before: '14.2%',
        current: '28.4%',
        changePercent: '+100.0% lost share',
        context: 'Campaign hits daily spend ceiling before 4 PM in 6 out of the past 7 days.',
      },
      recommendedAction: 'Increase daily budget from $160/day to $210/day (+31.2%). Capital can be reallocated directly from Display.',
      expectedImpact: 'Projected +22 conversions/month (+$2,940 gross monthly margin at 4.7 ROAS).',
      confidence: 93,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      actionPayload: {
        type: 'BUDGET_CHANGE',
        targetId: 'camp-01',
        targetName: 'Search - High Intent Core Conversions',
        oldValue: 160,
        newValue: 210,
      },
    }
  ];

  for (const ins of initialInsights) {
    const docRef = doc(db, 'users', userId, 'insights', ins.id);
    await setDoc(docRef, ins);
  }

  // Initial Real Budget Recommendation
  const rec: BudgetRecommendation = {
    id: 'bud-rec-01',
    campaignFromId: 'camp-03',
    campaignFromName: 'Display - Retargeting & Remarketing',
    campaignToId: 'camp-01',
    campaignToName: 'Search - High Intent Core Conversions',
    currentBudgetFrom: 75.00,
    proposedBudgetFrom: 25.00,
    currentBudgetTo: 160.00,
    proposedBudgetTo: 210.00,
    reallocatedAmount: 50.00,
    reason: 'Display retargeting CPA ($210.00) is 7.4x higher than Search High Intent ($28.45). Moving $50/day into Search captures high-converting demand currently lost to budget caps.',
    supportingMetrics: {
      fromRoas: 0.86,
      toRoas: 4.71,
      fromCpa: 210.00,
      toCpa: 28.45,
      fromSpend: 1890.00,
      toSpend: 4210.50,
    },
    estimatedMonthlyImpact: '+$4,230/mo net profit (+36 additional conversions, -$1,500 wasted spend)',
    status: 'PENDING',
  };
  await setDoc(doc(db, 'users', userId, 'budgetRecommendations', rec.id), rec);

  // Initial Real Anomalies
  const anom: AnomalyAlert = {
    id: 'anom-01',
    campaignId: 'camp-03',
    campaignName: 'Display - Retargeting & Remarketing',
    metric: 'CPA',
    severity: 'CRITICAL',
    title: 'Severe CPA Spike (+145%) in Retargeting',
    whatChanged: 'CPA rose from $85.55 to $210.00 over the past 7 days while conversions dropped 50%.',
    whenChanged: 'Detected today',
    whyItMatters: 'Campaign consumed $1,890.00 of advertising budget with only 9 conversions, causing ROAS to drop to 0.86.',
    recommendedAction: 'Reduce daily budget from $75/day to $25/day and pause non-converting app placements.',
    detectedAt: new Date().toISOString(),
    resolved: false,
    autoExecutable: true,
  };
  await setDoc(doc(db, 'users', userId, 'anomalies', anom.id), anom);

  // Initial Automation Rule
  const rule: AutomationRule = {
    id: 'rule-01',
    name: 'Emergency CPA Bleed Safeguard',
    category: 'AUTO_OPTIMIZE',
    conditionDescription: 'If campaign 7-day CPA exceeds $150 and spend exceeds $500',
    conditionMetric: 'CPA',
    conditionOperator: '>',
    conditionValue: 150,
    durationDays: 7,
    actionType: 'RECOMMEND_BUDGET_CUT',
    actionDescription: 'Reduce daily budget by 30% and notify account lead',
    enabled: true,
    requiresApproval: true,
    maxBudgetShiftLimitPercent: 15,
    lastTriggeredAt: new Date().toISOString(),
    executionCount: 1,
  };
  await setDoc(doc(db, 'users', userId, 'automationRules', rule.id), rule);

  // Initial Audit Log
  const log: AuditLog = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    campaignId: 'camp-01',
    campaignName: 'Search - High Intent Core Conversions',
    actionType: 'ACCOUNT_PROVISIONED',
    previousValue: 'None',
    newValue: 'Active Monitoring Enabled',
    reason: 'Initial setup of Google Ads account monitoring in AdOptimize.',
    source: 'USER',
    userOrSystem: accountName,
    status: 'EXECUTED',
    canRevert: false,
  };
  await addAuditLogToFirestore(userId, log);
}

// 11. Delete Campaign
export async function deleteCampaignFromFirestore(userId: string, campaignId: string) {
  const path = `users/${userId}/campaigns/${campaignId}`;
  try {
    const docRef = doc(db, 'users', userId, 'campaigns', campaignId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 12. Keywords
export async function fetchUserKeywords(userId: string): Promise<Keyword[]> {
  const path = `users/${userId}/keywords`;
  try {
    const colRef = collection(db, 'users', userId, 'keywords');
    const snap = await getDocs(colRef);
    const items: Keyword[] = [];
    snap.forEach((d) => {
      items.push(d.data() as Keyword);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveKeywordToFirestore(userId: string, keyword: Keyword) {
  const path = `users/${userId}/keywords/${keyword.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'keywords', keyword.id);
    await setDoc(docRef, keyword, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteKeywordFromFirestore(userId: string, keywordId: string) {
  const path = `users/${userId}/keywords/${keywordId}`;
  try {
    const docRef = doc(db, 'users', userId, 'keywords', keywordId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 13. Search Terms
export async function fetchUserSearchTerms(userId: string): Promise<SearchTerm[]> {
  const path = `users/${userId}/searchTerms`;
  try {
    const colRef = collection(db, 'users', userId, 'searchTerms');
    const snap = await getDocs(colRef);
    const items: SearchTerm[] = [];
    snap.forEach((d) => {
      items.push(d.data() as SearchTerm);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveSearchTermToFirestore(userId: string, term: SearchTerm) {
  const path = `users/${userId}/searchTerms/${term.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'searchTerms', term.id);
    await setDoc(docRef, term, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 14. Clear All User Data (Purge fake/demo data completely)
export async function clearAllUserData(userId: string) {
  const collections = [
    'campaigns',
    'insights',
    'anomalies',
    'budgetRecommendations',
    'automationRules',
    'auditLogs',
    'keywords',
    'searchTerms',
  ];

  for (const colName of collections) {
    try {
      const colRef = collection(db, 'users', userId, colName);
      const snap = await getDocs(colRef);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn(`Error clearing ${colName}:`, e);
    }
  }

  // Reset connected account to blank state
  try {
    const docRef = doc(db, 'users', userId, 'accounts', 'primary');
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Error clearing account:', e);
  }
}
