'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUp,
  Sidebar as SidebarIcon,
  ChevronLeft,
  ChevronRight,
  Share,
  CheckCircle2,
  Wrench,
  Terminal,
  Zap,
  RotateCw,
  Plus,
  ChevronDown
} from 'lucide-react';
import { DeepSeekIcon, ChatGPTIcon, GeminiIcon } from '@/components/ui/ai-model-icons';

export type SupportedModel = 'deepseek' | 'chatgpt' | 'gemini';

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
  id: SupportedModel;
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

const MODEL_THEMES: Record<SupportedModel, ModelThemeConfig> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    version: 'DeepSeek-V3',
    windowBg: 'bg-[#F4F6FB]', // DeepSeek clean high-tech canvas
    titleBarBg: 'bg-[#F4F6FB]',
    titleBarBorder: 'border-[#D9E1F0]',
    textColor: 'text-slate-900',
    mutedTextColor: 'text-slate-500',
    userBubbleBg: 'bg-[#1E293B]',
    userBubbleText: 'text-white',
    assistantBubbleBg: 'bg-white',
    assistantBubbleBorder: 'border-[#D9E1F0]',
    assistantText: 'text-slate-900',
    toolChipBg: 'bg-blue-50/90',
    toolChipBorder: 'border-blue-200/90',
    toolChipText: 'text-[#1E40AF]',
    toolPrefix: 'DeepSeek Tool Call',
    fontClass: 'font-sans',
    sendBtnBg: 'bg-[#1E40AF]',
    sendBtnText: 'text-white',
    accentColor: '#1E40AF'
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    version: 'GPT-4o',
    windowBg: 'bg-[#F9F9FB]', // Clean OpenAI neutral
    titleBarBg: 'bg-[#F9F9FB]',
    titleBarBorder: 'border-slate-200/80',
    textColor: 'text-slate-900',
    mutedTextColor: 'text-slate-500',
    userBubbleBg: 'bg-slate-900',
    userBubbleText: 'text-white',
    assistantBubbleBg: 'bg-white',
    assistantBubbleBorder: 'border-slate-200/90',
    assistantText: 'text-slate-900',
    toolChipBg: 'bg-slate-100',
    toolChipBorder: 'border-slate-200',
    toolChipText: 'text-slate-700',
    toolPrefix: 'Ran tool',
    fontClass: 'font-sans',
    sendBtnBg: 'bg-slate-900',
    sendBtnText: 'text-white',
    accentColor: '#10A37F'
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    version: '2.5 Pro',
    windowBg: 'bg-[#F2F5FA]', // Google soft ice-blue canvas
    titleBarBg: 'bg-[#F2F5FA]',
    titleBarBorder: 'border-[#D9E2EE]',
    textColor: 'text-slate-900',
    mutedTextColor: 'text-slate-500',
    userBubbleBg: 'bg-[#152338]',
    userBubbleText: 'text-white',
    assistantBubbleBg: 'bg-white',
    assistantBubbleBorder: 'border-blue-100',
    assistantText: 'text-slate-900',
    toolChipBg: 'bg-blue-50/90',
    toolChipBorder: 'border-blue-200/70',
    toolChipText: 'text-blue-900',
    toolPrefix: 'Function Call',
    fontClass: 'font-sans',
    sendBtnBg: 'bg-[#1A73E8]',
    sendBtnText: 'text-white',
    accentColor: '#1A73E8'
  }
};

export interface ModelDemoSimulatorProps {
  onConnectGoogleAds?: () => void;
  onOpenApp?: () => void;
}

export function ModelDemoSimulator({
  onConnectGoogleAds,
  onOpenApp
}: ModelDemoSimulatorProps = {}) {
  const [selectedModel, setSelectedModel] = useState<SupportedModel>('deepseek');
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
  const theme = MODEL_THEMES[selectedModel];
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

  // Main automated conversation runner
  useEffect(() => {
    let isCancelled = false;
    let activeTimer: NodeJS.Timeout | null = null;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        activeTimer = setTimeout(() => {
          if (!isCancelled) resolve();
        }, ms);
      });

    const streamIntoInput = async (text: string, speed = 24) => {
      for (let i = 0; i <= text.length; i++) {
        if (isCancelled) return;
        setTypedInputField(text.slice(0, i));
        await wait(speed);
      }
    };

    const streamText = async (text: string, onUpdate: (val: string) => void, speed = 18) => {
      for (let i = 0; i <= text.length; i++) {
        if (isCancelled) return;
        onUpdate(text.slice(0, i));
        await wait(speed);
      }
    };

    const runSimulation = async () => {
      // 1. Initial reset
      await wait(50);
      if (isCancelled) return;

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

      // 2. Type user message 1 into the bottom sending field
      await wait(300);
      await streamIntoInput(scenario.userMessage1, 24);
      if (isCancelled) return;

      // 3. Send button pressed animation
      setIsSendPressed(true);
      await wait(220);
      if (isCancelled) return;
      setIsSendPressed(false);
      setTypedInputField('');

      // 4. User 1 message appears in chat thread
      setUser1Message(scenario.userMessage1);
      await wait(450);
      if (isCancelled) return;

      // 5. Tool 1 running execution indicator
      setTool1State({ name: scenario.toolName1, isRunning: true });
      await wait(650);
      if (isCancelled) return;
      setTool1State({ name: scenario.toolName1, isRunning: false });
      await wait(350);
      if (isCancelled) return;

      // 6. AI 1 streams replying from left to right like real AI
      setAi1Visible(true);
      setAi1IsStreaming(true);

      // Stream title
      await streamText(scenario.assistantMessage1.title, setAi1StreamedTitle, 16);
      if (isCancelled) return;
      await wait(200);

      // Status badge reveals
      setAi1ShowStatus(true);
      await wait(250);

      // Stream checks one by one
      for (const check of scenario.assistantMessage1.checks) {
        if (isCancelled) return;
        await streamText(check, setAi1CurrentCheck, 14);
        if (isCancelled) return;
        setAi1CompletedChecks((prev) => [...prev, check]);
        setAi1CurrentCheck('');
        await wait(180);
      }

      // Stream footer
      await streamText(scenario.assistantMessage1.footer, setAi1StreamedFooter, 15);
      if (isCancelled) return;
      setAi1IsStreaming(false);

      // 7. Pause before user 2 turn
      await wait(1500);
      if (isCancelled) return;

      // 8. Type user message 2 into the bottom sending field
      await streamIntoInput(scenario.userMessage2, 26);
      if (isCancelled) return;

      // 9. Send button pressed
      setIsSendPressed(true);
      await wait(200);
      if (isCancelled) return;
      setIsSendPressed(false);
      setTypedInputField('');

      // 10. User 2 message pops into chat thread
      setUser2Message(scenario.userMessage2);
      await wait(400);
      if (isCancelled) return;

      // 11. Tool 2 execution
      setTool2State({ name: scenario.toolName2, isRunning: true });
      await wait(650);
      if (isCancelled) return;
      setTool2State({ name: scenario.toolName2, isRunning: false });
      await wait(300);
      if (isCancelled) return;

      // 12. AI 2 streams replying from left to right
      setAi2Visible(true);
      setAi2IsStreaming(true);
      await streamText(scenario.assistantMessage2.title, setAi2StreamedTitle, 16);
      if (isCancelled) return;
      await wait(200);
      setAi2ShowStatus(true);
      await wait(250);
      await streamText(scenario.assistantMessage2.footer, setAi2StreamedFooter, 15);
      if (isCancelled) return;
      setAi2IsStreaming(false);

      // 13. Completed hold time so viewer can read the resolution
      await wait(6500);
      if (isCancelled) return;

      // 14. Advance to next scenario
      setScenarioIndex((prev) => prev + 1);
    };

    runSimulation();

    return () => {
      isCancelled = true;
      if (activeTimer) clearTimeout(activeTimer);
    };
  }, [scenarioIndex, selectedModel, scenario]);

  // Handle switching tabs (DeepSeek / ChatGPT / Gemini)
  const handleModelSelect = (model: SupportedModel) => {
    if (model === selectedModel) return;
    setSelectedModel(model);
    setScenarioIndex((prev) => prev + 1);
  };

  const handleNextScenario = () => {
    setScenarioIndex((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* 1. FLOATING MODEL SELECTOR PILL */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-full shadow-lg shadow-slate-200/80 border border-slate-200/90">
          {/* DeepSeek Tab */}
          <button
            type="button"
            onClick={() => handleModelSelect('deepseek')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              selectedModel === 'deepseek'
                ? 'bg-[#1E40AF] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            {/* DeepSeek Stylized Whale Logo */}
            <DeepSeekIcon
              className={`w-3.5 h-3.5 shrink-0 ${selectedModel === 'deepseek' ? 'text-white' : 'text-[#1E40AF]'}`}
            />
            <span>DeepSeek</span>
          </button>

          {/* ChatGPT Tab */}
          <button
            type="button"
            onClick={() => handleModelSelect('chatgpt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              selectedModel === 'chatgpt'
                ? 'bg-[#10A37F] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            {/* OpenAI Spiral */}
            <ChatGPTIcon
              className={`w-3.5 h-3.5 shrink-0 ${selectedModel === 'chatgpt' ? 'text-white' : 'text-slate-800'}`}
            />
            <span>ChatGPT</span>
          </button>

          {/* Gemini Tab */}
          <button
            type="button"
            onClick={() => handleModelSelect('gemini')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              selectedModel === 'gemini'
                ? 'bg-[#1A73E8] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            {/* Google Gemini 4-Point Radiant Star */}
            <GeminiIcon
              className={`w-3.5 h-3.5 shrink-0 ${selectedModel === 'gemini' ? 'text-white' : 'text-[#1A73E8]'}`}
            />
            <span>Gemini</span>
          </button>
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
                {selectedModel === 'deepseek' && (
                  <Terminal className="w-3 h-3 text-[#1E40AF]" />
                )}
                {selectedModel === 'chatgpt' && (
                  <Wrench className="w-3 h-3 text-emerald-600" />
                )}
                {selectedModel === 'gemini' && (
                  <Zap className="w-3 h-3 text-blue-600" />
                )}
                <span>
                  {theme.toolPrefix}: <strong className="font-semibold">{tool1State.name}</strong>
                </span>
                {tool1State.isRunning ? (
                  <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin ml-1 opacity-70" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1" />
                )}
              </div>
            </div>
          )}

          {/* Assistant Turn 1 (Types from left to right like real AI) */}
          {ai1Visible && (
            <div className="flex items-start gap-3 animate-in fade-in zoom-in-99 duration-300">
              {/* Model Avatar */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 select-none">
                {selectedModel === 'deepseek' && (
                  <div className="w-6 h-6 rounded-full bg-[#1E40AF] text-white flex items-center justify-center font-bold text-[9px] shadow-2xs">
                    DS
                  </div>
                )}
                {selectedModel === 'chatgpt' && (
                  <svg className="w-4 h-4 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.5 10.3a5.2 5.2 0 0 0-.4-4 5.3 5.3 0 0 0-4.9-2.7 5.2 5.2 0 0 0-3.2-1.6 5.3 5.3 0 0 0-5.1 2.9 5.2 5.2 0 0 0-3.5 1.7 5.3 5.3 0 0 0-.7 5.5 5.2 5.2 0 0 0-1.8 3.5 5.3 5.3 0 0 0 2 5.3 5.2 5.2 0 0 0 3.2 1.6 5.3 5.3 0 0 0 5.1-2.9 5.2 5.2 0 0 0 3.5-1.7 5.3 5.3 0 0 0 .8-5.5 5.2 5.2 0 0 0 1.8-3.5 5.3 5.3 0 0 0-2-5.3l-.2.1Zm-7.7 11.2a3.8 3.8 0 0 1-2.4-.9l.1-.1 4-2.3a.8.8 0 0 0 .4-.7v-5.6l1.7 1v4.8a3.8 3.8 0 0 1-3.8 3.8Zm-8.6-4.1a3.8 3.8 0 0 1-.5-2.5l.1.1 4 2.3a.8.8 0 0 0 .8 0l4.8-2.8v2l-4.1 2.4a3.8 3.8 0 0 1-5.1-1.5Zm-1.4-8.8a3.8 3.8 0 0 1 1.9-1.7v4.7a.8.8 0 0 0 .4.7l4.8 2.8-1.7 1-4.1-2.4a3.8 3.8 0 0 1-1.3-5.1Zm13.5 4.3-4.8-2.8 1.7-1 4.1 2.4a3.8 3.8 0 0 1 1.3 5.1 3.8 3.8 0 0 1-1.9 1.7v-4.7a.8.8 0 0 0-.4-.7Zm2.1-3.8-4-2.3a.8.8 0 0 0-.8 0l-4.8 2.8v-2l4.1-2.4a3.8 3.8 0 0 1 5.5 3.9ZM9.5 12.8l2.5-1.5 2.5 1.5v2.9l-2.5 1.5-2.5-1.5v-2.9Z" />
                  </svg>
                )}
                {selectedModel === 'gemini' && (
                  <svg className="w-4 h-4 text-[#1A73E8]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c.3 6.6 5.4 11.7 12 12-6.6.3-11.7 5.4-12 12-.3-6.6-5.4-11.7-12-12C6.6 11.7 11.7 6.6 12 0Z" />
                  </svg>
                )}
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
                {selectedModel === 'deepseek' && (
                  <Terminal className="w-3 h-3 text-[#1E40AF]" />
                )}
                {selectedModel === 'chatgpt' && (
                  <Wrench className="w-3 h-3 text-emerald-600" />
                )}
                {selectedModel === 'gemini' && (
                  <Zap className="w-3 h-3 text-blue-600" />
                )}
                <span>
                  {theme.toolPrefix}: <strong className="font-semibold">{tool2State.name}</strong>
                </span>
                {tool2State.isRunning ? (
                  <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin ml-1 opacity-70" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1" />
                )}
              </div>
            </div>
          )}

          {/* Assistant Turn 2 (Confirmation streaming from left to right) */}
          {ai2Visible && (
            <div className="flex items-start gap-3 animate-in fade-in zoom-in-99 duration-300">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 select-none">
                {selectedModel === 'deepseek' && (
                  <div className="w-6 h-6 rounded-full bg-[#1E40AF] text-white flex items-center justify-center font-bold text-[9px] shadow-2xs">
                    DS
                  </div>
                )}
                {selectedModel === 'chatgpt' && (
                  <svg className="w-4 h-4 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.5 10.3a5.2 5.2 0 0 0-.4-4 5.3 5.3 0 0 0-4.9-2.7 5.2 5.2 0 0 0-3.2-1.6 5.3 5.3 0 0 0-5.1 2.9 5.2 5.2 0 0 0-3.5 1.7 5.3 5.3 0 0 0-.7 5.5 5.2 5.2 0 0 0-1.8 3.5 5.3 5.3 0 0 0 2 5.3 5.2 5.2 0 0 0 3.2 1.6 5.3 5.3 0 0 0 5.1-2.9 5.2 5.2 0 0 0 3.5-1.7 5.3 5.3 0 0 0 .8-5.5 5.2 5.2 0 0 0 1.8-3.5 5.3 5.3 0 0 0-2-5.3l-.2.1Zm-7.7 11.2a3.8 3.8 0 0 1-2.4-.9l.1-.1 4-2.3a.8.8 0 0 0 .4-.7v-5.6l1.7 1v4.8a3.8 3.8 0 0 1-3.8 3.8Zm-8.6-4.1a3.8 3.8 0 0 1-.5-2.5l.1.1 4 2.3a.8.8 0 0 0 .8 0l4.8-2.8v2l-4.1 2.4a3.8 3.8 0 0 1-5.1-1.5Zm-1.4-8.8a3.8 3.8 0 0 1 1.9-1.7v4.7a.8.8 0 0 0 .4.7l4.8 2.8-1.7 1-4.1-2.4a3.8 3.8 0 0 1-1.3-5.1Zm13.5 4.3-4.8-2.8 1.7-1 4.1 2.4a3.8 3.8 0 0 1 1.3 5.1 3.8 3.8 0 0 1-1.9 1.7v-4.7a.8.8 0 0 0-.4-.7Zm2.1-3.8-4-2.3a.8.8 0 0 0-.8 0l-4.8 2.8v-2l4.1-2.4a3.8 3.8 0 0 1 5.5 3.9ZM9.5 12.8l2.5-1.5 2.5 1.5v2.9l-2.5 1.5-2.5-1.5v-2.9Z" />
                  </svg>
                )}
                {selectedModel === 'gemini' && (
                  <svg className="w-4 h-4 text-[#1A73E8]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c.3 6.6 5.4 11.7 12 12-6.6.3-11.7 5.4-12 12-.3-6.6-5.4-11.7-12-12C6.6 11.7 11.7 6.6 12 0Z" />
                  </svg>
                )}
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
                  <span
                    className={`inline-block w-[1.5px] h-3.5 ml-0.5 align-middle animate-pulse ${
                      selectedModel === 'deepseek'
                        ? 'bg-[#1E40AF]'
                        : selectedModel === 'chatgpt'
                        ? 'bg-slate-900'
                        : 'bg-[#1A73E8]'
                    }`}
                  />
                </div>
              ) : (
                <span className="text-slate-400 truncate">
                  {user1Message && !user2Message
                    ? 'Awaiting decision or approval...'
                    : 'Ask anything or simulate Google Ads automation...'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono font-medium">
                <span>{theme.version}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>

              {/* Send Button: Pulses/clicks when message is sent into the chat */}
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-150 ${
                  theme.sendBtnBg
                } ${theme.sendBtnText} ${
                  isSendPressed
                    ? 'scale-85 ring-4 ring-blue-500/30 shadow-md'
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
