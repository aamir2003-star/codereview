'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PrArchitectureSummary } from '@/lib/review-api';
import {
  Layers,
  Cpu,
  GitCommit,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  FileCode2,
  Workflow,
  Sparkles,
} from 'lucide-react';

interface PrArchitectureViewerProps {
  architecture?: PrArchitectureSummary;
  isAnalyzing?: boolean;
}

export function PrArchitectureViewer({ architecture, isAnalyzing }: PrArchitectureViewerProps) {
  if (isAnalyzing && !architecture?.highLevelSummary) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center bg-black border border-[#262626] rounded-none my-6">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/20 text-white mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-t-white border-r-transparent border-b-transparent border-l-transparent"
          />
          <Workflow className="h-6 w-6 text-white" />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
          NEURAL ARCHITECTURE SYNTHESIS
        </span>
        <h3 className="font-sans text-xl font-normal uppercase tracking-[2px] text-white mt-2">
          Deconstructing System Topology
        </h3>
        <p className="font-serif text-sm text-[#cccccc] max-w-md mt-3 leading-relaxed">
          Gemini AI is analyzing component interdependencies, architectural state mutations, and data flow pipelines for this pull request...
        </p>
      </div>
    );
  }

  if (!architecture || (!architecture.highLevelSummary && !architecture.architectureOverview)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-black border border-[#262626] rounded-none my-6">
        <Layers className="h-8 w-8 text-[#666666] mb-3" />
        <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
          ARCHITECTURE NOT GENERATED
        </span>
        <p className="font-serif text-sm text-[#cccccc] max-w-sm mt-2">
          Trigger an AI review to synthesize full system topology and CodeRabbit-style PR architecture.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 my-4 text-white">
      {/* Top Banner / Executive Summary */}
      <div className="border border-[#262626] bg-[#0d0d0d] p-6 sm:p-8 rounded-none relative">
        <div className="flex items-center justify-between gap-4 border-b border-[#262626] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
            <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
              PR ARCHITECTURE SPECIFICATION
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-white px-3 py-1 border border-[#3a3a3a] rounded-full">
            CODERABBIT COMPATIBLE
          </span>
        </div>

        {/* High-level Summary */}
        <div className="space-y-3">
          <h2 className="font-sans text-lg sm:text-xl font-normal uppercase tracking-[2px] text-white">
            Executive Summary
          </h2>
          <p className="font-serif text-base text-[#e6e6e6] leading-relaxed">
            {architecture.highLevelSummary}
          </p>
        </div>

        {/* Architecture Overview */}
        {architecture.architectureOverview && (
          <div className="mt-6 pt-6 border-t border-[#262626] space-y-3">
            <span className="font-mono text-[11px] uppercase tracking-[2.5px] text-[#999999]">
              SYSTEM TOPOLOGY & PATTERNS
            </span>
            <p className="font-serif text-sm text-[#cccccc] leading-relaxed whitespace-pre-line">
              {architecture.architectureOverview}
            </p>
          </div>
        )}
      </div>

      {/* Key Components Changed */}
      {architecture.keyComponentsChanged && architecture.keyComponentsChanged.length > 0 && (
        <div className="border border-[#262626] bg-black rounded-none p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
              MUTATED SYSTEM COMPONENTS ({architecture.keyComponentsChanged.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {architecture.keyComponentsChanged.map((comp, idx) => (
              <div
                key={idx}
                className="border border-[#262626] bg-[#0d0d0d] p-4 rounded-none space-y-2 relative"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-normal text-white uppercase tracking-[1px] truncate">
                    {comp.component}
                  </span>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[1.5px] px-2 py-0.5 rounded-full border ${
                      comp.impactLevel === 'HIGH'
                        ? 'border-white text-white bg-white/10'
                        : comp.impactLevel === 'MEDIUM'
                        ? 'border-[#999999] text-[#cccccc] bg-transparent'
                        : 'border-[#3a3a3a] text-[#666666] bg-transparent'
                    }`}
                  >
                    {comp.impactLevel} IMPACT
                  </span>
                </div>
                <p className="font-serif text-xs text-[#999999] leading-relaxed">
                  {comp.purpose}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sequence / Flow Diagram */}
      {architecture.sequenceFlowOrDiagram && (
        <div className="border border-[#262626] bg-[#0d0d0d] rounded-none p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
              DATA FLOW & EXECUTION PIPELINE
            </span>
            <Cpu className="h-4 w-4 text-[#999999]" />
          </div>

          <div className="bg-black border border-[#262626] p-4 font-mono text-xs text-[#e6e6e6] overflow-x-auto whitespace-pre leading-relaxed tracking-wider">
            {architecture.sequenceFlowOrDiagram}
          </div>
        </div>
      )}

      {/* File-by-File Walkthrough */}
      {architecture.walkthrough && architecture.walkthrough.length > 0 && (
        <div className="border border-[#262626] bg-black rounded-none p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
              CHANGES WALKTHROUGH ({architecture.walkthrough.length} FILES)
            </span>
            <FileCode2 className="h-4 w-4 text-[#999999]" />
          </div>

          <div className="divide-y divide-[#262626]">
            {architecture.walkthrough.map((item, idx) => (
              <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <div className="font-mono text-xs text-white uppercase tracking-[1px] shrink-0 sm:w-1/3 truncate">
                  {item.file}
                </div>
                <div className="font-serif text-sm text-[#cccccc] leading-relaxed flex-1">
                  {item.changes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Potential Risks & Verification Points */}
      {architecture.potentialRisks && architecture.potentialRisks.length > 0 && (
        <div className="border border-[#262626] bg-[#0d0d0d] rounded-none p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#262626] pb-3">
            <AlertTriangle className="h-4 w-4 text-[#d4a017]" />
            <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#e6e6e6]">
              RISK ASSESSMENT & TEST DIRECTIVES
            </span>
          </div>

          <ul className="space-y-2.5">
            {architecture.potentialRisks.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="font-mono text-[10px] text-[#999999] mt-1 shrink-0">
                  [{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}]
                </span>
                <span className="font-serif text-sm text-[#cccccc] leading-relaxed">
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
