'use client';

import React from 'react';
import { Package, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface BundleSizeWidgetProps {
  baseSizeKb: number;
  newSizeKb: number;
  percentChange: number;
  warnings?: string[];
}

export function BundleSizeWidget({
  baseSizeKb,
  newSizeKb,
  percentChange,
  warnings = [],
}: BundleSizeWidgetProps) {
  const isIncrease = percentChange > 0;
  const isLargeIncrease = percentChange > 10;

  return (
    <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" />
          <span className="font-medium text-zinc-200">Bundle Size Impact</span>
        </div>
        <div
          className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${
            isIncrease
              ? isLargeIncrease
                ? 'bg-red-950/60 text-red-400 border border-red-800'
                : 'bg-amber-950/60 text-amber-400 border border-amber-800'
              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
          }`}
        >
          {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>
            {isIncrease ? '+' : ''}
            {percentChange.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 mb-2">
        <div className="bg-zinc-800/40 p-2 rounded-lg">
          <div className="text-zinc-500">Base Size</div>
          <div className="font-mono text-zinc-300 font-semibold mt-0.5">{baseSizeKb} KB</div>
        </div>
        <div className="bg-zinc-800/40 p-2 rounded-lg">
          <div className="text-zinc-500">New Size</div>
          <div className="font-mono text-zinc-300 font-semibold mt-0.5">{newSizeKb} KB</div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {warnings.map((w, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
