'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';

interface QuotaMeterProps {
  used: number;
  quota: number;
  percentUsed: number;
  plan: string;
  onUpgrade?: () => void;
}

export function QuotaMeter({ used, quota, percentUsed, plan, onUpgrade }: QuotaMeterProps) {
  const isNearLimit = percentUsed >= 80;
  const isOverLimit = percentUsed >= 100;

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-zinc-100">Monthly Review Quota</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1 capitalize">{plan} Plan Tier</p>
        </div>
        {onUpgrade && plan !== 'enterprise' && (
          <Button
            size="sm"
            onClick={onUpgrade}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium text-xs px-3"
          >
            Upgrade Tier
          </Button>
        )}
      </div>

      <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isOverLimit
              ? 'bg-red-500'
              : isNearLimit
              ? 'bg-amber-400'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
          style={{ width: `${Math.min(100, percentUsed)}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-zinc-400">
        <span>{used.toLocaleString()} tokens used</span>
        <span>{quota.toLocaleString()} monthly limit</span>
      </div>

      {isOverLimit ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Quota exceeded. Background reviews will pause until plan upgrade or monthly reset.</span>
        </div>
      ) : isNearLimit ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/50">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Approaching plan quota ({percentUsed}% used). Consider upgrading.</span>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 p-2 rounded-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Account in good standing with active token capacity.</span>
        </div>
      )}
    </div>
  );
}
