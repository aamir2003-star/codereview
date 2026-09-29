'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Sparkles,
  AlertCircle,
  GitPullRequest,
  Activity,
  Cpu,
  Zap,
  Radio,
  FileCode2,
} from 'lucide-react';

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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2 }}
      className="relative group"
    >
      {/* 3D Holographic Ambient Background Glow */}
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-teal-500/20 opacity-60 blur-xl group-hover:opacity-100 transition duration-500" />

      <Card className="relative rounded-3xl border border-neutral-800/80 bg-neutral-950/80 backdrop-blur-2xl p-0 overflow-hidden shadow-2xl">
        {/* Top Accent Scanning Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />

        <div className="p-5 sm:p-6 space-y-5">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-sm"
                />
                <Activity className="h-5 w-5 relative" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>AI Copilot Health & Telemetry</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </h3>
                <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                  Connected to <span className="text-emerald-300 font-semibold">{repoName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-neutral-900/80 text-neutral-300 border-neutral-700/80 gap-1.5 text-[11px] font-mono py-1 px-2.5"
              >
                <Cpu className="h-3 w-3 text-cyan-400" />
                Gemini Flash AI Matrix
              </Badge>

              {isHealthy ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40 gap-1.5 text-[11px] font-mono py-1 px-2.5 shadow-sm shadow-emerald-500/10"
                >
                  <ShieldCheck className="h-3 w-3 text-emerald-400" /> Clean Status
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-500/15 text-amber-300 border-amber-500/40 gap-1.5 text-[11px] font-mono py-1 px-2.5 shadow-sm shadow-amber-500/10"
                >
                  <AlertCircle className="h-3 w-3 text-amber-400" /> {unresolvedCount} Issue{unresolvedCount === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
          </div>

          {/* 3D Glass Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1: Active PRs */}
            <div className="rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-4 relative overflow-hidden group/stat hover:border-emerald-500/40 hover:bg-neutral-900/80 transition-all duration-300">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Active PRs</span>
                <GitPullRequest className="h-4 w-4 text-emerald-400/80 group-hover/stat:text-emerald-300 transition-colors" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{totalPRs}</span>
                <span className="text-[11px] text-neutral-500">pull request{totalPRs === 1 ? '' : 's'}</span>
              </div>
            </div>

            {/* Card 2: Unresolved Issues */}
            <div className="rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-4 relative overflow-hidden group/stat hover:border-amber-500/40 hover:bg-neutral-900/80 transition-all duration-300">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Pending Issues</span>
                <AlertCircle className="h-4 w-4 text-amber-400/80 group-hover/stat:text-amber-300 transition-colors" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black font-mono ${unresolvedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {unresolvedCount}
                </span>
                <span className="text-[11px] text-neutral-500">{unresolvedCount === 0 ? 'fully resolved' : 'requires fix'}</span>
              </div>
            </div>

            {/* Card 3: Neural Review Mode */}
            <div className="rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-4 relative overflow-hidden group/stat hover:border-cyan-500/40 hover:bg-neutral-900/80 transition-all duration-300">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Analysis Engine</span>
                <Zap className="h-4 w-4 text-cyan-400/80 group-hover/stat:text-cyan-300 transition-colors" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold text-white font-mono">Real-time AST</span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Quick Informational Banner */}
          {notice && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3.5 text-xs text-neutral-300 flex items-center gap-3 shadow-inner backdrop-blur-md">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="flex-1 leading-relaxed text-xs text-neutral-300">{notice}</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
