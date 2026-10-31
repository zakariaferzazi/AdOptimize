'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUp,
  Sidebar as SidebarIcon,
  ChevronLeft,
  ChevronRight,
  Share,
  CheckCircle2,
  RotateCw,
  Plus,
  Sparkles,
} from 'lucide-react';
import { BrandLogoIcon } from '@/components/ui/brand-logo';

export type SupportedModel = 'adoptimize' | 'deepseek' | 'chatgpt' | 'gemini';

export interface ConversationalScenario {
  id: string;
  topicTitle: string;
  userMessage1: string;
  toolName1: string;
  assistantMessage1: {
    title: string;
    statusLine: string;
    checksHeader: string;
    checks: string[];
    footer: string;
  };
  userMessage2: string;
  toolName2: string;
  assistantMessage2: {
    title: string;
    statusLine: string;
    footer: string;
  };
}

export const CONVERSATIONAL_SCENARIOS: ConversationalScenario[] = [
  {
    id: 'q3-campaign-launch',
    topicTitle: 'Q3 search campaign — ready for review',
    userMessage1: 'Build the approved Q3 search campaign. Keep CPC under $8 and create it paused.',
    toolName1: 'Build Google Search Campaign',
    assistantMessage1: {
      title: 'Campaign built and verified.',
      statusLine: 'Status: PAUSED · 7 ad groups · 126 keywords · ready for review.',
      checksHeader: 'Checks completed:',
      checks: [
        '126 keywords grouped into 7 intent-led ad groups',
        'Budget, bidding, copy, and extensions match the brief',
        'Campaign is paused — nothing spends until you approve'
      ],
      footer: 'Nothing is live. Approve the build when you are ready.'
    },
    userMessage2: 'Approved. Launch it.',
    toolName2: 'Update Campaign Status',
    assistantMessage2: {
      title: 'Campaign live.',
      statusLine: 'Status: ENABLED — serving on Google Search.',
      footer: 'I’ll watch pacing and CPA, then bring you the next decision.'
    }
  },
  {
    id: 'negative-keyword-bleed',
    topicTitle: 'Search query waste & negative keyword bleed',
    userMessage1: 'Audit search queries from the last 14 days. Find irrelevant traffic spending budget with 0 conversions.',
    toolName1: 'Audit Search Query Performance',
    assistantMessage1: {
      title: 'Search query audit complete. 19 non-converting queries flagged.',
      statusLine: 'Status: AUDITED · $642.50 wasted spend found across 19 queries.',
      checksHeader: 'Top non-converting bleed terms:',
      checks: [
        "'free software download crack' — $214.20 spend · 0 conv",
        "'customer service 1800 phone number' — $182.50 spend · 0 conv",
        "'undergrad student internship jobs' — $128.00 spend · 0 conv"
      ],
      footer: "Drafted account negative list 'Q3_Waste_Exclusions'. Apply negative exact match?"
    },
    userMessage2: 'Approved. Add them to negatives immediately.',
    toolName2: 'Add Negative Keywords List',
    assistantMessage2: {
      title: '19 negative exact match terms applied.',
      statusLine: 'Status: ACTIVE · Exclusions deployed to all 4 Search campaigns.',
      footer: 'Projected monthly savings: ~$1,350. Converting high-intent search terms remain untouched.'
    }
  },
  {
    id: 'pmax-brand-cannibalization',
    topicTitle: 'Performance Max brand cannibalization & mobile app purge',
    userMessage1: 'Performance Max is claiming our branded search conversions and burning budget on random mobile gaming apps.',
    toolName1: 'Diagnose Performance Max Placements & Channels',
    assistantMessage1: {
      title: 'Performance Max diagnostic complete.',
      statusLine: 'Status: DIAGNOSED · 36% brand query overlap · 42 low-engagement app placements.',
      checksHeader: 'Findings verified:',
      checks: [
        '36% of PMax conversion credit is cannibalizing brand exact search',
        '$490 spent on casual mobile games with 0.02% conversion rate',
        'Drafted Brand Exclusion List + account-level mobile app category purge'
      ],
      footer: 'Ready to attach brand exclusion and block 140 mobile app categories.'
    },
    userMessage2: 'Approved. Deploy both exclusions now.',
    toolName2: 'Apply Brand Exclusions & App Category Purge',
    assistantMessage2: {
      title: 'Exclusions deployed successfully.',
      statusLine: 'Status: ENFORCED · Brand list attached · 140 mobile app categories blocked.',
      footer: 'PMax will now strictly acquire incremental net-new customers. Branded search routes to Brand Search.'
    }
  },
  {
    id: 'target-cpa-spike',
    topicTitle: 'Target CPA runaway spike & bid cap reset',
    userMessage1: 'Our CPA jumped from $38 to $92 this week on Core US Search. Diagnose and fix the runaway spend.',
    toolName1: 'Run Auction & Target CPA Diagnostics',
    assistantMessage1: {
      title: 'Diagnostic complete. Auction anomaly identified.',
      statusLine: 'Status: IDENTIFIED · Target CPA loosened after two broad match queries spiked bids.',
      checksHeader: 'Root causes & guardrails:',
      checks: [
        'Two broad match queries consumed 42% of daily budget at $14.80/click',
        'Smart Bidding overbid in off-peak hours after a competitor exited the auction',
        'Prepared guardrails: pause broad bleed and lock Max CPC bid cap at $7.50'
      ],
      footer: 'Ready to enforce the $7.50 safety bid cap and pause runaway broad match terms.'
    },
    userMessage2: 'Approved. Apply the bid cap and pause those broad queries.',
    toolName2: 'Enforce Bid Cap Guardrail & Pause Queries',
    assistantMessage2: {
      title: 'Bid cap guardrail enforced.',
      statusLine: 'Status: STABILIZED · Max CPC capped at $7.50 · Broad queries paused.',
      footer: 'Projected CPA returning to $38–$42 range within 24 hours. Auction pacing secured.'
    }
  },
  {
    id: 'broken-url-disapproval',
    topicTitle: 'Broken destination URLs & 404 policy disapproval fix',
    userMessage1: 'Google disapproved 14 ads for Destination Mismatch / 404 URL after our website release.',
    toolName1: 'Scan Final URLs & Policy Disapprovals',
    assistantMessage1: {
      title: 'Policy scan complete. 14 broken URLs detected.',
      statusLine: 'Status: FLAGGED · 14 ads returning HTTP 404 on legacy "/pricing-plans".',
      checksHeader: 'Resolution verified:',
      checks: [
        'Live target confirmed: https://app.example.com/pricing (HTTP 200 OK)',
        'Ad copy, extensions, and tracking templates preserved intact',
        'Automated batch update and policy review trigger prepared'
      ],
      footer: 'Ready to update all 14 final URLs and resubmit for expedited review.'
    },
    userMessage2: 'Approved. Update URLs and resubmit for review.',
    toolName2: 'Batch Update Final URLs & Resubmit',
    assistantMessage2: {
      title: 'All 14 ad destinations updated and resubmitted.',
      statusLine: 'Status: PENDING REVIEW · 0 broken links remaining in account.',
      footer: 'Ads typically re-enable within 2 hours. I’ll confirm when impressions resume.'
    }
  }
];

interface ModelThemeConfig {
  name: string;
  version: string;
  windowBg: string;
  titleBarBg: string;
  titleBarBorder: string;
  textColor: string;
  mutedTextColor: string;
  userBubbleBg: string;
  userBubbleText: string;
  assistantBubbleBg: string;
  assistantBubbleBorder: string;
  assistantText: string;
  toolChipBg: string;
  toolChipBorder: string;
  toolChipText: string;
  toolPrefix: string;
  fontClass: string;
  sendBtnBg: string;
  sendBtnText: string;
  accentColor: string;
}

const ADOPTIMIZE_THEME: ModelThemeConfig = {
  name: 'AdOptimize',
  version: 'AdOptimize Agent v2.4',
  windowBg: 'bg-[#F8FAFC]',
  titleBarBg: 'bg-[#F8FAFC]',
  titleBarBorder: 'border-slate-200/80',
  textColor: 'text-slate-900',
  mutedTextColor: 'text-slate-500',
  userBubbleBg: 'bg-slate-900',
  userBubbleText: 'text-white',
  assistantBubbleBg: 'bg-white',
  assistantBubbleBorder: 'border-slate-200/90',
  assistantText: 'text-slate-900',
  toolChipBg: 'bg-emerald-50/90',
  toolChipBorder: 'border-emerald-200/80',
  toolChipText: 'text-emerald-900',
  toolPrefix: 'AdOptimize Action',
  fontClass: 'font-sans',
  sendBtnBg: 'bg-slate-900',
  sendBtnText: 'text-white',
  accentColor: '#10B981'
};

export interface ModelDemoSimulatorProps {
  onConnectGoogleAds?: () => void;
  onOpenApp?: () => void;
}

export function ModelDemoSimulator({
  onConnectGoogleAds,
  onOpenApp
}: ModelDemoSimulatorProps = {}) {
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);

  // Input bar typing state
  const [typedInputField, setTypedInputField] = useState<string>('');
  const [isSendPressed, setIsSendPressed] = useState<boolean>(false);

  // Progressive chat messages state
  const [user1Message, setUser1Message] = useState<string | null>(null);
  const [tool1State, setTool1State] = useState<{ name: string; isRunning: boolean } | null>(null);

  // AI 1 streaming state (streams from left to right)
  const [ai1Visible, setAi1Visible] = useState<boolean>(false);
  const [ai1StreamedTitle, setAi1StreamedTitle] = useState<string>('');
  const [ai1ShowStatus, setAi1ShowStatus] = useState<boolean>(false);
  const [ai1CompletedChecks, setAi1CompletedChecks] = useState<string[]>([]);
  const [ai1CurrentCheck, setAi1CurrentCheck] = useState<string>('');
  const [ai1StreamedFooter, setAi1StreamedFooter] = useState<string>('');
  const [ai1IsStreaming, setAi1IsStreaming] = useState<boolean>(false);

  // User 2 & Tool 2 state
  const [user2Message, setUser2Message] = useState<string | null>(null);
  const [tool2State, setTool2State] = useState<{ name: string; isRunning: boolean } | null>(null);

  // AI 2 streaming state
  const [ai2Visible, setAi2Visible] = useState<boolean>(false);
  const [ai2StreamedTitle, setAi2StreamedTitle] = useState<string>('');
  const [ai2ShowStatus, setAi2ShowStatus] = useState<boolean>(false);
  const [ai2StreamedFooter, setAi2StreamedFooter] = useState<string>('');
  const [ai2IsStreaming, setAi2IsStreaming] = useState<boolean>(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const theme = ADOPTIMIZE_THEME;
  const scenario = CONVERSATIONAL_SCENARIOS[scenarioIndex % CONVERSATIONAL_SCENARIOS.length];

  // Auto-scroll inside chat thread as text streams in
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [
    user1Message,
    tool1State,
    ai1StreamedTitle,
    ai1CurrentCheck,
    ai1StreamedFooter,
    user2Message,
    tool2State,
    ai2StreamedTitle,
    ai2StreamedFooter
  ]);

  // Main automated conversation flow
  useEffect(() => {
    let isCancelled = false;
    let activeTimer: NodeJS.Timeout | null = null;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        activeTimer = setTimeout(() => {
          if (!isCancelled) resolve();
        }, ms);
      });

    // Helper to stream typing character-by-character
    const streamText = async (
      fullText: string,
      setter: (val: string) => void,
      charSpeedMs = 18
    ) => {
      let accumulated = '';
      for (let i = 0; i < fullText.length; i++) {
        if (isCancelled) return;
        accumulated += fullText[i];
        setter(accumulated);
        await wait(charSpeedMs);
      }
    };

    const runSimulation = async () => {
      // 0. RESET STATE for this scenario
      setTypedInputField('');
      setIsSendPressed(false);
      setUser1Message(null);
      setTool1State(null);
      setAi1Visible(false);
      setAi1StreamedTitle('');
      setAi1ShowStatus(false);
      setAi1CompletedChecks([]);
      setAi1CurrentCheck('');
      setAi1StreamedFooter('');
      setAi1IsStreaming(false);

      setUser2Message(null);
      setTool2State(null);
      setAi2Visible(false);
      setAi2StreamedTitle('');
      setAi2ShowStatus(false);
      setAi2StreamedFooter('');
      setAi2IsStreaming(false);

      await wait(600);
      if (isCancelled) return;

      // 1. TYPE USER PROMPT IN BOTTOM BAR
      await streamText(scenario.userMessage1, setTypedInputField, 22);
      if (isCancelled) return;

      await wait(400);
      if (isCancelled) return;

      // 2. PRESS SEND
      setIsSendPressed(true);
      await wait(180);
      if (isCancelled) return;

      // 3. MOVE MESSAGE INTO CHAT
      setUser1Message(scenario.userMessage1);
      setTypedInputField('');
      setIsSendPressed(false);

      await wait(500);
      if (isCancelled) return;

      // 4. TRIGGER TOOL 1
      setTool1State({ name: scenario.toolName1, isRunning: true });
      await wait(1100);
      if (isCancelled) return;
      setTool1State({ name: scenario.toolName1, isRunning: false });

      await wait(350);
      if (isCancelled) return;

      // 5. STREAM ASSISTANT MESSAGE 1
      setAi1Visible(true);
      setAi1IsStreaming(true);

      // Stream Title
      await streamText(scenario.assistantMessage1.title, setAi1StreamedTitle, 20);
      if (isCancelled) return;

      // Reveal Status Line
      setAi1ShowStatus(true);
      await wait(400);
      if (isCancelled) return;

      // Stream Checklist items one by one
      for (const checkText of scenario.assistantMessage1.checks) {
        if (isCancelled) return;
        await streamText(checkText, setAi1CurrentCheck, 16);
        if (isCancelled) return;
        setAi1CompletedChecks((prev) => [...prev, checkText]);
        setAi1CurrentCheck('');
        await wait(220);
      }

      // Stream Assistant 1 Footer
      await streamText(scenario.assistantMessage1.footer, setAi1StreamedFooter, 18);
      if (isCancelled) return;
      setAi1IsStreaming(false);

      // 6. DELIBERATION PAUSE BEFORE USER DECISION
      await wait(1400);
      if (isCancelled) return;

      // 7. TYPE USER TURN 2 IN BOTTOM BAR
      await streamText(scenario.userMessage2, setTypedInputField, 28);
      if (isCancelled) return;

      await wait(400);
      if (isCancelled) return;

      // 8. PRESS SEND FOR TURN 2
      setIsSendPressed(true);
      await wait(180);
      if (isCancelled) return;

      // 9. MOVE USER 2 MESSAGE INTO CHAT
      setUser2Message(scenario.userMessage2);
      setTypedInputField('');
      setIsSendPressed(false);

      await wait(500);
      if (isCancelled) return;

      // 10. TRIGGER TOOL 2 (EXECUTION OF OPTIMIZATION)
      setTool2State({ name: scenario.toolName2, isRunning: true });
      await wait(1200);
      if (isCancelled) return;
      setTool2State({ name: scenario.toolName2, isRunning: false });

      await wait(350);
      if (isCancelled) return;

      // 11. STREAM ASSISTANT TURN 2 CONFIRMATION
      setAi2Visible(true);
      setAi2IsStreaming(true);

      await streamText(scenario.assistantMessage2.title, setAi2StreamedTitle, 20);
      if (isCancelled) return;

      setAi2ShowStatus(true);
      await wait(350);
      if (isCancelled) return;

      await streamText(scenario.assistantMessage2.footer, setAi2StreamedFooter, 18);
      if (isCancelled) return;
      setAi2IsStreaming(false);

      // 12. COMPLETED HOLD TIME SO VIEWER CAN READ RESOLUTION
      await wait(6500);
      if (isCancelled) return;

      // 13. ADVANCE TO NEXT SCENARIO
      setScenarioIndex((prev) => prev + 1);
    };

    runSimulation();

    return () => {
      isCancelled = true;
      if (activeTimer) clearTimeout(activeTimer);
    };
  }, [scenarioIndex, scenario]);

  const handleNextScenario = () => {
    setScenarioIndex((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* 1. SINGLE ADOPTIMIZE AGENT BADGE */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/95 backdrop-blur-md rounded-full shadow-lg shadow-slate-200/80 border border-slate-200/90 select-none">
          <BrandLogoIcon size={20} className="w-5 h-5 rounded-md shrink-0 shadow-2xs" />
          <span className="text-sm font-semibold text-slate-900 tracking-tight">AdOptimize</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
            AI Marketing Agent
          </span>
        </div>
      </div>

      {/* 2. THE CLEAN WINDOW CONTAINER */}
      <div
        className={`w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-300/40 overflow-hidden transition-colors duration-500 flex flex-col ${theme.windowBg}`}
      >
        {/* macOS Minimal Window Titlebar */}
        <div
          className={`px-4 sm:px-5 py-3 border-b ${theme.titleBarBorder} ${theme.titleBarBg} flex items-center justify-between select-none`}
        >
          {/* Window Traffic Lights & Controls */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block shadow-2xs" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block shadow-2xs" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block shadow-2xs" />

            <div className="flex items-center gap-1.5 ml-3 sm:ml-4 text-slate-400">
              <SidebarIcon className="w-3.5 h-3.5 text-slate-400/80" />
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400/80" />
              <ChevronRight className="w-3.5 h-3.5 text-slate-400/80" />
            </div>
          </div>

          {/* Conversation Topic in Header */}
          <div className="flex items-center gap-2 max-w-[280px] sm:max-w-md truncate">
            <span className="text-xs font-medium text-slate-600 truncate">
              {scenario.topicTitle}
            </span>
          </div>

          {/* Quick Shuffle & Share */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNextScenario}
              title="Next simulation scenario"
              className="p-1 rounded-md hover:bg-black/[0.05] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <Share className="w-3.5 h-3.5 text-slate-400/80" />
          </div>
        </div>

        {/* 3. WINDOW INTERIOR CONVERSATION THREAD */}
        <div
          ref={chatContainerRef}
          className="p-4 sm:p-6 min-h-[440px] max-h-[520px] overflow-y-auto space-y-4 sm:space-y-5 text-left text-xs sm:text-sm"
        >
          {/* User Turn 1 (Revealed once sent from bottom field) */}
          {user1Message && (
            <div className="flex justify-end animate-in fade-in duration-300">
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-tr-xs px-4 py-3 leading-relaxed shadow-xs ${theme.userBubbleBg} ${theme.userBubbleText}`}
              >
                <p className="font-normal text-xs sm:text-[13px] leading-relaxed">
                  {user1Message}
                </p>
              </div>
            </div>
          )}

          {/* Tool Call 1 Chip */}
          {tool1State && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200 my-1">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-mono font-medium shadow-2xs ${theme.toolChipBg} ${theme.toolChipBorder} ${theme.toolChipText}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {theme.toolPrefix}: <strong className="font-semibold text-slate-900">{tool1State.name}</strong>
                </span>
                {tool1State.isRunning ? (
                  <div className="w-2.5 h-2.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin ml-1 opacity-70" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-1 shrink-0" />
                )}
              </div>
            </div>
          )}

          {/* Assistant Turn 1 (AdOptimize Avatar + Structured Card) */}
          {ai1Visible && (
            <div className="flex items-start gap-3 animate-in fade-in zoom-in-99 duration-300">
              {/* AdOptimize Brand Icon */}
              <div className="shrink-0 mt-0.5 select-none">
                <BrandLogoIcon size={24} className="w-6 h-6 rounded-lg shadow-2xs" />
              </div>

              {/* Conversational Assistant Card */}
              <div
                className={`flex-1 rounded-2xl rounded-tl-xs p-4 sm:p-5 border shadow-xs space-y-3 ${theme.assistantBubbleBg} ${theme.assistantBubbleBorder} ${theme.assistantText}`}
              >
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                    {ai1StreamedTitle}
                    {ai1IsStreaming && !ai1ShowStatus && (
                      <span className="inline-block w-[2px] h-3 ml-0.5 align-middle bg-slate-900 animate-pulse" />
                    )}
                  </h4>

                  {ai1ShowStatus && (
                    <div className="mt-1 text-xs text-slate-700 font-mono bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5 inline-block animate-in fade-in duration-200">
                      {scenario.assistantMessage1.statusLine}
                    </div>
                  )}
                </div>

                {ai1ShowStatus && (
                  <div className="space-y-1 pt-1 animate-in fade-in duration-200">
                    <p className="text-xs font-medium text-slate-600">
                      {scenario.assistantMessage1.checksHeader}
                    </p>
                    <ul className="space-y-1 text-xs text-slate-700 pl-1">
                      {ai1CompletedChecks.map((check, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <span>{check}</span>
                        </li>
                      ))}
                      {ai1CurrentCheck && (
                        <li className="flex items-start gap-2 leading-relaxed">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <span>
                            {ai1CurrentCheck}
                            <span className="inline-block w-[1.5px] h-3 ml-0.5 align-middle bg-slate-900 animate-pulse" />
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {ai1StreamedFooter && (
                  <p className="text-xs text-slate-600 pt-1 border-t border-slate-100/90 leading-relaxed font-medium">
                    {ai1StreamedFooter}
                    {ai1IsStreaming && (
                      <span className="inline-block w-[1.5px] h-3 ml-0.5 align-middle bg-slate-900 animate-pulse" />
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* User Turn 2 (Revealed once sent from bottom field) */}
          {user2Message && (
            <div className="flex justify-end animate-in fade-in duration-300">
              <div
                className={`max-w-[85%] rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-xs ${theme.userBubbleBg} ${theme.userBubbleText}`}
              >
                <p className="font-medium text-xs sm:text-[13px] leading-relaxed">
                  {user2Message}
                </p>
              </div>
            </div>
          )}

          {/* Tool Call 2 Chip */}
          {tool2State && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200 my-1">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-mono font-medium shadow-2xs ${theme.toolChipBg} ${theme.toolChipBorder} ${theme.toolChipText}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {theme.toolPrefix}: <strong className="font-semibold text-slate-900">{tool2State.name}</strong>
                </span>
                {tool2State.isRunning ? (
                  <div className="w-2.5 h-2.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin ml-1 opacity-70" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-1 shrink-0" />
                )}
              </div>
            </div>
          )}

          {/* Assistant Turn 2 (Confirmation streaming from left to right) */}
          {ai2Visible && (
            <div className="flex items-start gap-3 animate-in fade-in zoom-in-99 duration-300">
              {/* AdOptimize Brand Icon */}
              <div className="shrink-0 mt-0.5 select-none">
                <BrandLogoIcon size={24} className="w-6 h-6 rounded-lg shadow-2xs" />
              </div>

              <div
                className={`flex-1 rounded-2xl rounded-tl-xs p-4 sm:p-5 border shadow-xs space-y-2.5 ${theme.assistantBubbleBg} ${theme.assistantBubbleBorder} ${theme.assistantText}`}
              >
                <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                  {ai2StreamedTitle}
                  {ai2IsStreaming && !ai2ShowStatus && (
                    <span className="inline-block w-[2px] h-3 ml-0.5 align-middle bg-slate-900 animate-pulse" />
                  )}
                </h4>

                {ai2ShowStatus && (
                  <div className="text-xs text-emerald-800 font-mono bg-emerald-50 border border-emerald-200/60 rounded-md px-2.5 py-1.5 inline-block font-medium animate-in fade-in duration-200">
                    {scenario.assistantMessage2.statusLine}
                  </div>
                )}

                {ai2StreamedFooter && (
                  <p className="text-xs text-slate-700 leading-relaxed pt-1">
                    {ai2StreamedFooter}
                    {ai2IsStreaming && (
                      <span className="inline-block w-[1.5px] h-3 ml-0.5 align-middle bg-slate-900 animate-pulse" />
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. BOTTOM SENDING FIELD (Starts typing user message, then sends it) */}
        <div className="p-3 sm:p-4 border-t border-black/[0.06] bg-white/70 backdrop-blur-xs select-none">
          <div
            className={`w-full bg-white rounded-xl border ${theme.assistantBubbleBorder} shadow-2xs px-3.5 py-2.5 flex items-center justify-between pointer-events-none select-none`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-normal min-w-0 flex-1 mr-3">
              <Plus className="w-4 h-4 text-slate-400 shrink-0" />
              {typedInputField ? (
                <div className="text-slate-900 font-normal truncate">
                  <span>{typedInputField}</span>
                  <span className="inline-block w-[1.5px] h-3.5 ml-0.5 align-middle bg-emerald-600 animate-pulse" />
                </div>
              ) : (
                <span className="text-slate-400 truncate">
                  {user1Message && !user2Message
                    ? 'Awaiting decision or approval...'
                    : 'Ask anything or simulate Google Ads automation...'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono font-medium">
                <BrandLogoIcon size={14} className="w-3.5 h-3.5 rounded-sm shrink-0" />
                <span>AdOptimize Agent</span>
              </div>

              {/* Send Button: Pulses/clicks when message is sent into the chat */}
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-150 ${
                  theme.sendBtnBg
                } ${theme.sendBtnText} ${
                  isSendPressed
                    ? 'scale-85 ring-4 ring-emerald-500/30 shadow-md'
                    : typedInputField
                    ? 'opacity-100 shadow-2xs'
                    : 'opacity-70 shadow-2xs'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
