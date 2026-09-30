'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, ShieldCheck, AlertCircle } from 'lucide-react';

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
    <div className="border border-[#262626] bg-[#0d0d0d] p-6 sm:p-8 rounded-none text-white space-y-6">
      {/* Header Band */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
            <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
              ENGINEERING TELEMETRY
            </span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-normal uppercase tracking-[2px] text-white">
            {repoName}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#999999] px-3 py-1 border border-[#262626] rounded-full">
            GEMINI MATRIX ACTIVE
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-[2px] px-3 py-1 rounded-full border ${
              isHealthy
                ? 'border-white text-white'
                : 'border-[#d4a017] text-[#d4a017]'
            }`}
          >
            {isHealthy ? 'DIAGNOSTIC CLEAN' : `${unresolvedCount} PENDING`}
          </span>
        </div>
      </div>

      {/* Spec Cells Grid (Bugatti Spec-Cell Component) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#262626] border border-[#262626] bg-black">
        {/* Spec 1: Active PRs */}
        <div className="p-5 sm:p-6 space-y-1">
          <div className="font-display text-3xl sm:text-4xl font-normal tracking-[2px] text-white">
            {totalPRs < 10 ? `0${totalPRs}` : totalPRs}
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[2px] text-[#999999]">
            SYNCHRONIZED PRS
          </div>
        </div>

        {/* Spec 2: Open Issues */}
        <div className="p-5 sm:p-6 space-y-1">
          <div
            className={`font-display text-3xl sm:text-4xl font-normal tracking-[2px] ${
              unresolvedCount > 0 ? 'text-[#e6e6e6]' : 'text-white'
            }`}
          >
            {unresolvedCount < 10 ? `0${unresolvedCount}` : unresolvedCount}
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[2px] text-[#999999]">
            {unresolvedCount === 0 ? 'ALL RESOLVED' : 'UNRESOLVED AUDITS'}
          </div>
        </div>

        {/* Spec 3: Architecture Engine */}
        <div className="p-5 sm:p-6 space-y-1">
          <div className="font-display text-3xl sm:text-4xl font-normal tracking-[2px] text-white">
            REALTIME
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[2px] text-[#999999]">
            CODERABBIT AST & DIFF
          </div>
        </div>
      </div>

      {/* Notice / Briefing */}
      {notice && (
        <div className="pt-2 border-t border-[#262626] flex items-start gap-3">
          <div className="font-mono text-[10px] text-[#666666] tracking-widest uppercase mt-0.5 shrink-0">
            [NOTICE]
          </div>
          <p className="font-serif text-xs sm:text-sm text-[#cccccc] leading-relaxed">
            {notice}
          </p>
        </div>
      )}
    </div>
  );
}
