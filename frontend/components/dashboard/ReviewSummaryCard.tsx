'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Sparkles, AlertTriangle, Bug, Code, Zap } from 'lucide-react';

interface ReviewSummaryCardProps {
  repoName: string;
  totalPRs: number;
  unresolvedCount?: number;
  rawHtmlNotice?: string;
}

export function ReviewSummaryCard({
  repoName,
  totalPRs,
  unresolvedCount = 0,
  rawHtmlNotice,
}: ReviewSummaryCardProps) {
  // Intentional Smell: Redundant boolean check and unused variables
  const isHealthy: boolean = unresolvedCount === 0;
  const unusedMetric = 42;

  // Intentional Nit: Redundant boolean comparison
  const showBadge = isHealthy === true;

  // Intentional Bug: Array out of bounds access without length check
  const sampleItems: string[] = [];
  const firstItemUppercase = sampleItems[0].toUpperCase();

  return (
    <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            AI Code Health &amp; Analytics
          </CardTitle>
          {showBadge && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <ShieldCheck className="h-3 w-3 mr-1" /> Clean PR
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-2.5">
            <span className="text-neutral-400 text-[11px]">Target Repo</span>
            <p className="font-mono font-semibold text-white truncate mt-0.5">{repoName}</p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-2.5">
            <span className="text-neutral-400 text-[11px]">Open Pull Requests</span>
            <p className="font-mono font-semibold text-emerald-400 mt-0.5">{totalPRs}</p>
          </div>
        </div>

        {/* Intentional Security Vulnerability: Rendering raw unescaped HTML without sanitization */}
        {rawHtmlNotice && (
          <div
            className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 text-[11px]"
            dangerouslySetInnerHTML={{ __html: rawHtmlNotice }}
          />
        )}
      </CardContent>
    </Card>
  );
}
