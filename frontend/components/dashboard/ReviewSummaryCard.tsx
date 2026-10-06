'use client';

import React from 'react';

interface ReviewSummaryCardProps {
  repoName: string;
  totalPRs: number;
  unresolvedCount?: number;
  notice?: string;
}

export const ReviewSummaryCard = React.memo(function ReviewSummaryCard({
  repoName,
  totalPRs,
  unresolvedCount = 0,
  notice,
}: ReviewSummaryCardProps) {
  const isHealthy = unresolvedCount === 0;

  return (
    <div className="border border-[#262626] bg-[#0d0d0d] p-4 sm:p-4.5 rounded-xl text-white space-y-3 shadow-sm">
      {/* Header Band */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#262626] pb-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#a1a1aa]">
              Repository Health &amp; Telemetry
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
            {repoName}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#a1a1aa] px-2.5 py-0.5 border border-[#262626] rounded-full bg-black/40">
            Gemini AI Active
          </span>
          <span
            className={`font-mono text-[11px] px-2.5 py-0.5 rounded-full border ${
              isHealthy
                ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20'
                : 'border-amber-500/40 text-amber-300 bg-amber-950/20'
            }`}
          >
            {isHealthy ? 'Clean Status' : `${unresolvedCount} Issues`}
          </span>
        </div>
      </div>

      {/* Spec Cells Grid */}
      <div className="grid grid-cols-3 divide-x divide-[#262626] border border-[#262626] bg-black rounded-lg overflow-hidden">
        {/* Spec 1: Active PRs */}
        <div className="p-2.5 sm:p-3 space-y-0.5">
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-white leading-none">
            {totalPRs < 10 ? `0${totalPRs}` : totalPRs}
          </div>
          <div className="font-mono text-[10px] sm:text-[11px] text-[#71717a] truncate">
            Active Pull Requests
          </div>
        </div>

        {/* Spec 2: Open Issues */}
        <div className="p-2.5 sm:p-3 space-y-0.5">
          <div
            className={`text-lg sm:text-xl font-bold font-mono tracking-tight leading-none ${
              unresolvedCount > 0 ? 'text-amber-400' : 'text-white'
            }`}
          >
            {unresolvedCount < 10 ? `0${unresolvedCount}` : unresolvedCount}
          </div>
          <div className="font-mono text-[10px] sm:text-[11px] text-[#71717a] truncate">
            {unresolvedCount === 0 ? 'All Resolved' : 'Pending Issues'}
          </div>
        </div>

        {/* Spec 3: Architecture Engine */}
        <div className="p-2.5 sm:p-3 space-y-0.5">
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-white leading-none">
            Realtime
          </div>
          <div className="font-mono text-[10px] sm:text-[11px] text-[#71717a] truncate">
            AST &amp; CodeRabbit Topology
          </div>
        </div>
      </div>

      {/* Notice / Briefing */}
      {notice && (
        <div className="pt-2 border-t border-[#262626] flex items-center gap-2">
          <span className="font-mono text-[10px] text-[#71717a] shrink-0">
            [NOTE]
          </span>
          <p className="text-[11px] text-[#8e8e93] leading-normal truncate">
            {notice}
          </p>
        </div>
      )}
    </div>
  );
});
