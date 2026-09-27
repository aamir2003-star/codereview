'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Sparkles, AlertCircle, GitPullRequest, Activity } from 'lucide-react';

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
    <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Repository Review Health
          </CardTitle>
          {isHealthy ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 text-[11px]">
              <ShieldCheck className="h-3 w-3" /> All Clean
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1 text-[11px]">
              <AlertCircle className="h-3 w-3" /> {unresolvedCount} Unresolved
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3 flex flex-col justify-between">
            <span className="text-neutral-400 text-[11px]">Active Repository</span>
            <p className="font-mono font-semibold text-white truncate mt-1">{repoName}</p>
          </div>
          <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3 flex flex-col justify-between">
            <span className="text-neutral-400 text-[11px]">Open Pull Requests</span>
            <div className="flex items-center gap-2 mt-1">
              <GitPullRequest className="h-4 w-4 text-emerald-400" />
              <span className="font-mono font-bold text-emerald-400 text-base">{totalPRs}</span>
            </div>
          </div>
        </div>

        {notice && (
          <div className="p-2.5 rounded-xl bg-neutral-950/40 border border-neutral-800 text-neutral-300 text-[11px] flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
