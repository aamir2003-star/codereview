'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ReviewSummaryCardProps {
  repoName: string;
  totalPRs: number;
  unresolvedCount?: number;
  notice?: string;
}

export function ReviewSummaryCard({
  repoName,
  totalPRs,
  unresolvedCount = 0,
  notice,
}: ReviewSummaryCardProps) {
  const isHealthy = unresolvedCount === 0;

  return (
    <div className="border border-[#262626] bg-[#0d0d0d] p-6 sm:p-7 rounded-xl text-white space-y-5">
      {/* Header Band */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#a1a1aa]">
              Repository Health &amp; Telemetry
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            {repoName}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-[#a1a1aa] px-3 py-1 border border-[#262626] rounded-full">
            Gemini AI Active
          </span>
          <span
            className={`font-mono text-xs px-3 py-1 rounded-full border ${
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
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#262626] border border-[#262626] bg-black rounded-lg overflow-hidden">
        {/* Spec 1: Active PRs */}
        <div className="p-4 sm:p-5 space-y-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            {totalPRs < 10 ? `0${totalPRs}` : totalPRs}
          </div>
          <div className="font-mono text-xs text-[#a1a1aa]">
            Active Pull Requests
          </div>
        </div>

        {/* Spec 2: Open Issues */}
        <div className="p-4 sm:p-5 space-y-1">
          <div
            className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
              unresolvedCount > 0 ? 'text-amber-400' : 'text-white'
            }`}
          >
            {unresolvedCount < 10 ? `0${unresolvedCount}` : unresolvedCount}
          </div>
          <div className="font-mono text-xs text-[#a1a1aa]">
            {unresolvedCount === 0 ? 'All Resolved' : 'Pending Audit Issues'}
          </div>
        </div>

        {/* Spec 3: Architecture Engine */}
        <div className="p-4 sm:p-5 space-y-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            Realtime
          </div>
          <div className="font-mono text-xs text-[#a1a1aa]">
            AST &amp; CodeRabbit Topology
          </div>
        </div>
      </div>

      {/* Notice / Briefing */}
      {notice && (
        <div className="pt-2 border-t border-[#262626] flex items-start gap-2.5">
          <span className="font-mono text-xs text-[#71717a] shrink-0 mt-0.5">
            [NOTE]
          </span>
          <p className="text-xs sm:text-sm text-[#a1a1aa] leading-relaxed">
            {notice}
          </p>
        </div>
      )}
    </div>
  );
}
