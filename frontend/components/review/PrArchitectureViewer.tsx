'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PrArchitectureSummary } from '@/lib/review-api';
import {
  Layers,
  Cpu,
  AlertTriangle,
  FileCode2,
  Workflow,
  Search,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Sparkles,
} from 'lucide-react';

interface PrArchitectureViewerProps {
  architecture?: PrArchitectureSummary;
  isAnalyzing?: boolean;
}

export function PrArchitectureViewer({ architecture, isAnalyzing }: PrArchitectureViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllFiles, setShowAllFiles] = useState(false);

  const filteredWalkthrough = useMemo(() => {
    if (!architecture?.walkthrough) return [];
    if (!searchQuery.trim()) return architecture.walkthrough;
    const q = searchQuery.toLowerCase();
    return architecture.walkthrough.filter(
      (item) =>
        item.file.toLowerCase().includes(q) || item.changes.toLowerCase().includes(q)
    );
  }, [architecture?.walkthrough, searchQuery]);

  const displayedWalkthrough = useMemo(() => {
    if (showAllFiles || searchQuery.trim() || filteredWalkthrough.length <= 12) {
      return filteredWalkthrough;
    }
    return filteredWalkthrough.slice(0, 12);
  }, [filteredWalkthrough, showAllFiles, searchQuery]);

  if (isAnalyzing && !architecture?.highLevelSummary) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center bg-[#0d0d0d] border border-[#262626] rounded-xl my-6">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 text-white mb-5">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-t-white border-r-transparent border-b-transparent border-l-transparent"
          />
          <Workflow className="h-5 w-5 text-white" />
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
          Understanding Code Changes
        </span>
        <h3 className="text-lg font-semibold text-white mt-1.5">
          Building Beginner-Friendly Architecture Map
        </h3>
        <p className="text-sm text-[#a1a1aa] max-w-md mt-2 leading-relaxed">
          Gemini AI is analyzing what this pull request does, how files connect together, and breaking it down into simple, easy-to-understand explanations...
        </p>
      </div>
    );
  }

  if (!architecture || (!architecture.highLevelSummary && !architecture.architectureOverview)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0d0d0d] border border-[#262626] rounded-xl my-6">
        <Layers className="h-8 w-8 text-[#666666] mb-3" />
        <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
          Architecture Map Not Ready
        </span>
        <p className="text-sm text-[#a1a1aa] max-w-sm mt-1.5">
          Trigger an AI review to generate a plain-English explanation of this pull request and its architecture.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 my-4 text-white">
      {/* Top Banner / What This PR Does (Plain English) */}
      <div className="border border-[#262626] bg-[#0d0d0d] p-6 sm:p-7 rounded-xl space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-[#262626] pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#e4e4e7]">
              PR Overview &amp; Architecture Map
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#a1a1aa] px-3 py-1 border border-[#3a3a3a] rounded-full">
            <Sparkles className="h-3 w-3 text-amber-400" />
            Plain-English Guide
          </span>
        </div>

        {/* High-level Summary */}
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            What This Pull Request Does
          </h2>
          <p className="text-sm sm:text-[15px] text-[#e4e4e7] leading-relaxed">
            {architecture.highLevelSummary}
          </p>
        </div>

        {/* Architecture Overview & Metaphor */}
        {architecture.architectureOverview && (
          <div className="pt-4 border-t border-[#262626] space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
              How the System Fits Together
            </span>
            <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-line">
              {architecture.architectureOverview}
            </p>
          </div>
        )}
      </div>

      {/* Key Components Changed */}
      {architecture.keyComponentsChanged && architecture.keyComponentsChanged.length > 0 && (
        <div className="border border-[#262626] bg-[#0d0d0d] rounded-xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
              Core Areas Changed ({architecture.keyComponentsChanged.length})
            </span>
            <span className="text-xs text-[#71717a]">
              What each part does &amp; why it matters
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {architecture.keyComponentsChanged.map((comp, idx) => (
              <div
                key={idx}
                className="border border-[#262626] bg-[#141414] p-4 rounded-lg space-y-2 hover:border-[#383838] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-white truncate">
                    {comp.component}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      comp.impactLevel === 'HIGH'
                        ? 'border-rose-500/50 text-rose-300 bg-rose-950/30'
                        : comp.impactLevel === 'MEDIUM'
                        ? 'border-amber-500/50 text-amber-300 bg-amber-950/30'
                        : 'border-[#3a3a3a] text-[#a1a1aa] bg-transparent'
                    }`}
                  >
                    {comp.impactLevel}
                  </span>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  {comp.purpose}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step-by-Step Request Flow Diagram */}
      {architecture.sequenceFlowOrDiagram && (
        <div className="border border-[#262626] bg-[#0d0d0d] rounded-xl p-6 sm:p-7 space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
              How Requests Flow (Step-by-Step)
            </span>
            <Cpu className="h-4 w-4 text-[#999999]" />
          </div>

          <div className="bg-[#141414] border border-[#262626] p-4 rounded-lg font-mono text-xs text-[#e4e4e7] overflow-x-auto whitespace-pre leading-relaxed">
            {architecture.sequenceFlowOrDiagram}
          </div>
        </div>
      )}

      {/* File-by-File Walkthrough */}
      {architecture.walkthrough && architecture.walkthrough.length > 0 && (
        <div className="border border-[#262626] bg-[#0d0d0d] rounded-xl p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3.5">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-[#999999]" />
              <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
                File-by-File Walkthrough ({architecture.walkthrough.length} Files)
              </span>
            </div>

            {/* Search / Filter Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#71717a]" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div className="divide-y divide-[#262626]">
            {displayedWalkthrough.map((item, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                <div className="font-mono text-xs text-white shrink-0 sm:w-2/5 break-all">
                  {item.file}
                </div>
                <div className="text-xs sm:text-sm text-[#a1a1aa] leading-relaxed flex-1">
                  {item.changes}
                </div>
              </div>
            ))}

            {displayedWalkthrough.length === 0 && (
              <div className="py-8 text-center text-xs text-[#71717a]">
                No files matched &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>

          {/* Expand / Collapse toggle for large PRs */}
          {!searchQuery && architecture.walkthrough.length > 12 && (
            <div className="pt-2 flex justify-center border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setShowAllFiles(!showAllFiles)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141414] border border-[#262626] hover:border-white/30 text-xs font-mono text-[#e4e4e7] transition-colors"
              >
                {showAllFiles ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Show Less (First 12 Files)
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Show All {architecture.walkthrough.length} Files
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Helpful Watch-Outs & Things to Test */}
      {architecture.potentialRisks && architecture.potentialRisks.length > 0 && (
        <div className="border border-[#262626] bg-[#0d0d0d] rounded-xl p-6 sm:p-7 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-[#262626] pb-3">
            <AlertTriangle className="h-4 w-4 text-[#d4a017]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#e4e4e7]">
              Helpful Watch-Outs &amp; Things to Test
            </span>
          </div>

          <ul className="space-y-2.5">
            {architecture.potentialRisks.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-mono text-xs text-amber-400 mt-0.5 shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-xs sm:text-sm text-[#d4d4d8] leading-relaxed">
                  {risk}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
