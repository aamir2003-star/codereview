'use client';

import React from 'react';
import { PolicyRule } from '@/lib/policy-api';
import { Shield, Zap, RefreshCw, FileCode, Check } from 'lucide-react';

interface RuleBuilderProps {
  rules: PolicyRule[];
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onSeverityChange: (ruleId: string, severity: 'error' | 'warning' | 'info') => void;
}

export function RuleBuilder({ rules, onToggleRule, onSeverityChange }: RuleBuilderProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="w-4 h-4 text-red-400" />;
      case 'performance':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'concurrency':
        return <RefreshCw className="w-4 h-4 text-cyan-400" />;
      default:
        return <FileCode className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`p-4 rounded-xl border transition-all ${
            rule.enabled
              ? 'bg-zinc-900/60 border-zinc-800'
              : 'bg-zinc-950/40 border-zinc-900 opacity-60'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-zinc-800/60 mt-0.5">{getCategoryIcon(rule.category)}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-zinc-200">{rule.name}</span>
                  <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    {rule.id}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{rule.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                disabled={!rule.enabled}
                value={rule.severity}
                onChange={(e) => onSeverityChange(rule.id, e.target.value as any)}
                className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>

              <button
                onClick={() => onToggleRule(rule.id, !rule.enabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                  rule.enabled ? 'bg-cyan-500 justify-end' : 'bg-zinc-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
