'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PrArchitectureSummary } from '@/lib/review-api';
import {
  Layers,
  Cpu,
  AlertTriangle,
  FileCode2,
  Workflow,
} from 'lucide-react';

interface PrArchitectureViewerProps {
  architecture?: PrArchitectureSummary;
  isAnalyzing?: boolean;
}

export function PrArchitectureViewer({ architecture, isAnalyzing }: PrArchitectureViewerProps) {
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
          Neural Architecture Synthesis
        </span>
        <h3 className="text-lg font-semibold text-white mt-1.5">
          Deconstructing System Topology
        </h3>
        <p className="text-sm text-[#a1a1aa] max-w-md mt-2 leading-relaxed">
          Gemini AI is analyzing component interdependencies, architectural state mutations, and data flow pipelines for this pull request...
        </p>
      </div>
    );
  }

  if (!architecture || (!architecture.highLevelSummary && !architecture.architectureOverview)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0d0d0d] border border-[#262626] rounded-xl my-6">
        <Layers className="h-8 w-8 text-[#666666] mb-3" />
        <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
          Architecture Not Generated
        </span>
        <p className="text-sm text-[#a1a1aa] max-w-sm mt-1.5">
          Trigger an AI review to synthesize full system topology and CodeRabbit-style PR architecture.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 my-4 text-white">
      {/* Top Banner / Executive Summary */}
      <div className="border border-[#262626] bg-[#0d0d0d] p-6 sm:p-7 rounded-xl space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-[#262626] pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
              PR Architecture Specification
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#a1a1aa] px-3 py-1 border border-[#3a3a3a] rounded-full">
            CodeRabbit Engine
          </span>
        </div>

        {/* High-level Summary */}
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-white tracking-tight">
            Executive Summary
          </h2>
          <p className="text-sm text-[#d4d4d8] leading-relaxed">
            {architecture.highLevelSummary}
          </p>
        </div>

        {/* Architecture Overview */}
        {architecture.architectureOverview && (
          <div className="pt-4 border-t border-[#262626] space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
              System Topology &amp; Patterns
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
              Mutated System Components ({architecture.keyComponentsChanged.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {architecture.keyComponentsChanged.map((comp, idx) => (
              <div
                key={idx}
                className="border border-[#262626] bg-[#141414] p-4 rounded-lg space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-medium text-white truncate">
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

      {/* Sequence / Flow Diagram */}
      {architecture.sequenceFlowOrDiagram && (
        <div className="border border-[#262626] bg-[#0d0d0d] rounded-xl p-6 sm:p-7 space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
              Data Flow &amp; Execution Pipeline
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
        <div className="border border-[#262626] bg-[#0d0d0d] rounded-xl p-6 sm:p-7 space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#999999]">
              Changes Walkthrough ({architecture.walkthrough.length} Files)
            </span>
            <FileCode2 className="h-4 w-4 text-[#999999]" />
          </div>

          <div className="divide-y divide-[#262626]">
            {architecture.walkthrough.map((item, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <div className="font-mono text-xs text-white shrink-0 sm:w-1/3 truncate">
                  {item.file}
                </div>
                <div className="text-xs sm:text-sm text-[#a1a1aa] leading-relaxed flex-1">
                  {item.changes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Potential Risks & Verification Points */}
      {architecture.potentialRisks && architecture.potentialRisks.length > 0 && (
        <div className="border border-[#262626] bg-[#0d0d0d] rounded-xl p-6 sm:p-7 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-[#262626] pb-3">
            <AlertTriangle className="h-4 w-4 text-[#d4a017]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#e4e4e7]">
              Risk Assessment &amp; Directives
            </span>
          </div>

          <ul className="space-y-2">
            {architecture.potentialRisks.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-mono text-xs text-[#71717a] mt-0.5 shrink-0">
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
