'use client';

import React, { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  Bell,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Play,
  Pause,
  SlidersHorizontal,
  Lock,
  History,
  Info
} from 'lucide-react';
import { AutomationRule } from '@/types/adoptimize';

interface AutomationViewProps {
  rules: AutomationRule[];
  onToggleRule: (ruleId: string) => void;
  onAddRule: (newRule: AutomationRule) => void;
}

export function AutomationView({
  rules,
  onToggleRule,
  onAddRule,
}: AutomationViewProps) {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'MONITOR' | 'RECOMMEND' | 'AUTO_OPTIMIZE'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleMetric, setNewRuleMetric] = useState<'CPA' | 'ROAS' | 'SPEND_NO_CONV' | 'CPC_SPIKE'>('CPA');
  const [newRuleThreshold, setNewRuleThreshold] = useState('100');
  const [newRuleCategory, setNewRuleCategory] = useState<'MONITOR' | 'RECOMMEND' | 'AUTO_OPTIMIZE'>('RECOMMEND');

  const filteredRules = rules.filter((r) => {
    if (activeCategory === 'ALL') return true;
    return r.category === activeCategory;
  });

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) return;

    const created: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      category: newRuleCategory,
      conditionDescription: `If ${newRuleMetric} exceeds threshold of ${newRuleThreshold} for 5 consecutive days`,
      conditionMetric: newRuleMetric,
      conditionOperator: '>',
      conditionValue: parseFloat(newRuleThreshold) || 100,
      durationDays: 5,
      actionType: newRuleCategory === 'MONITOR' ? 'NOTIFY' : 'RECOMMEND_BUDGET_CUT',
      actionDescription: newRuleCategory === 'MONITOR' ? 'Send instant team email and dashboard alert' : 'Draft budget cut proposal for review',
      enabled: true,
      requiresApproval: true,
      maxBudgetShiftLimitPercent: 15,
      executionCount: 0,
    };

    onAddRule(created);
    setNewRuleName('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Guarded Automation Engine</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Automation Center & Safeguards
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Configure autonomous rules across 3 distinct tiers. Realize high-velocity ad optimization while enforcing hard financial boundaries.
          </p>
        </div>

        {/* 3 Tier Explanation Cards */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Bell className="w-4 h-4 text-blue-400" />
              <span>1. MONITOR</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Detects thresholds and notifies team immediately. Never alters account.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>2. RECOMMEND</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Detects opportunities and drafts ready-to-execute proposals for approval.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00d67d]">
              <ShieldCheck className="w-4 h-4" />
              <span>3. AUTO-OPTIMIZE</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Executes safely within strict limits (max ±15% shift) with full audit log.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Add Rule Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs">
          {[
            { id: 'ALL', label: 'All Rules' },
            { id: 'MONITOR', label: 'Monitor Only' },
            { id: 'RECOMMEND', label: 'Recommend' },
            { id: 'AUTO_OPTIMIZE', label: 'Auto-Optimize' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeCategory === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4 text-[#00d67d]" />
          <span>Create Automation Rule</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3.5">
        {filteredRules.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-4">
            <Zap className="w-10 h-10 text-[#00d67d] mx-auto" />
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-base font-bold text-slate-900">No Custom Automation Rules Yet</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Set up automated safeguards to detect sudden CPA spikes, cap budget drift, and prevent wasted spend on non-converting search terms.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  onAddRule({
                    id: `rule-${Date.now()}-1`,
                    name: 'Auto-Pause Bleeders: Spend > $120 with 0 Conversions',
                    category: 'RECOMMEND',
                    conditionDescription: 'If ad spend exceeds $120 with 0 conversions over 7 days',
                    conditionMetric: 'SPEND_NO_CONV',
                    conditionOperator: '>',
                    conditionValue: 120,
                    durationDays: 7,
                    actionType: 'PAUSE_SEARCH_TERM',
                    actionDescription: 'Draft proposal to pause keyword and add as negative',
                    enabled: true,
                    requiresApproval: true,
                    maxBudgetShiftLimitPercent: 15,
                    lastTriggeredAt: new Date().toISOString(),
                    executionCount: 0,
                  });
                }}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Activate Bleeder Protector Template
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Create Custom Rule
              </button>
            </div>
          </div>
        ) : (
          filteredRules.map((rule) => {
          const isAuto = rule.category === 'AUTO_OPTIMIZE';
          const isRec = rule.category === 'RECOMMEND';

          return (
            <div
              key={rule.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-slate-300 transition-colors"
            >
              {/* Left Details */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isAuto
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : isRec
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {rule.category.replace('_', ' ')}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {rule.name}
                  </h4>
                </div>

                <div className="text-xs text-slate-700 font-medium">
                  {rule.conditionDescription}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Action: {rule.actionDescription}</span>
                  {rule.maxBudgetShiftLimitPercent > 0 && (
                    <>
                      <span>·</span>
                      <span className="font-semibold text-emerald-700">
                        Max Shift: ±{rule.maxBudgetShiftLimitPercent}%
                      </span>
                    </>
                  )}
                  {rule.lastTriggeredAt && (
                    <>
                      <span>·</span>
                      <span>Triggered {rule.executionCount} times</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => onToggleRule(rule.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    rule.enabled
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {rule.enabled ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Disabled</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">New Automation Rule</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pause search terms with >$150 spend & 0 conv"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Execution Tier</label>
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                >
                  <option value="MONITOR">MONITOR (Send notification alert only)</option>
                  <option value="RECOMMEND">RECOMMEND (Draft proposal for human approval)</option>
                  <option value="AUTO_OPTIMIZE">AUTO-OPTIMIZE (Guarded execution with audit)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trigger Metric</label>
                  <select
                    value={newRuleMetric}
                    onChange={(e) => setNewRuleMetric(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="CPA">CPA Threshold</option>
                    <option value="ROAS">ROAS Minimum</option>
                    <option value="SPEND_NO_CONV">Spend with 0 Conv</option>
                    <option value="CPC_SPIKE">CPC Spike %</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Threshold Value</label>
                  <input
                    type="number"
                    value={newRuleThreshold}
                    onChange={(e) => setNewRuleThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  Safety Enforcement: Any automatic changes are capped at ±15% daily limit and immediately reversible via Change History.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                >
                  Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
