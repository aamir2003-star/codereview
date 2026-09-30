'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repository, PullRequest } from '@/lib/api';
import {
  GitPullRequest,
  GitBranch,
  Calendar,
  ExternalLink,
  Code2,
  Sparkles,
  ArrowRight,
  Inbox,
} from 'lucide-react';

interface PrListProps {
  repo: Repository | null;
  pullRequests: PullRequest[];
  isLoading: boolean;
  onInspectDiff: (pr: PullRequest) => void;
  onStartReview: (pr: PullRequest) => void;
}

export function PrList({
  repo,
  pullRequests,
  isLoading,
  onInspectDiff,
  onStartReview,
}: PrListProps) {
  if (!repo) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] border border-[#262626] bg-black text-center p-8 rounded-none">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#262626] text-white mb-4">
          <GitPullRequest className="h-6 w-6 text-[#999999]" />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
          SELECT REPOSITORY
        </span>
        <h3 className="font-display text-lg font-normal uppercase tracking-[2px] text-white mt-1">
          No Target Specified
        </h3>
        <p className="font-serif text-sm text-[#cccccc] max-w-xs mt-2 leading-relaxed">
          Choose a repository from the left matrix to inspect pull requests, architectural topology, and trigger AI reviews.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] border border-[#262626] bg-black rounded-none overflow-hidden text-white">
      {/* Header */}
      <div className="p-5 border-b border-[#262626] bg-[#0d0d0d] flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm sm:text-base font-normal uppercase tracking-[2px] text-white truncate">
              {repo.full_name}
            </h2>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              title="View on GitHub"
              className="text-[#666666] hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[1.5px] text-[#999999] mt-0.5">
            {pullRequests.length} OPEN PULL REQUEST{pullRequests.length === 1 ? '' : 'S'}
          </p>
        </div>
      </div>

      {/* PR Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#262626]">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-[#141414] animate-pulse border border-[#262626]" />
            ))}
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#999999]">
            <Inbox className="h-8 w-8 opacity-40 mb-2" />
            <span className="font-mono text-xs uppercase tracking-[2px]">NO OPEN PULL REQUESTS</span>
            <p className="font-serif text-xs text-[#666666] max-w-xs mt-1.5">
              All pull requests in {repo.name} have been merged or closed.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {pullRequests.map((pr) => (
              <div
                key={pr.id}
                className="p-5 sm:p-6 bg-black hover:bg-[#0d0d0d] transition-colors relative group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* PR Number + Title */}
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs uppercase tracking-[1.5px] text-white px-2.5 py-0.5 border border-[#3a3a3a] rounded-none shrink-0">
                        #{pr.number}
                      </span>
                      <h3 className="font-display text-base sm:text-lg font-normal uppercase tracking-[1.5px] text-white group-hover:text-[#e6e6e6] transition-colors truncate">
                        {pr.title}
                      </h3>
                    </div>

                    {/* Metadata: Branch & Author */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[1px] text-[#999999]">
                      <div className="flex items-center gap-1.5 text-[#cccccc]">
                        <GitBranch className="h-3 w-3 text-white" />
                        <span>{pr.head.ref}</span>
                        <span className="text-[#666666]">&rarr;</span>
                        <span>{pr.base.ref}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-serif text-xs capitalize text-[#999999]">
                        {pr.user.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pr.user.avatar_url}
                            alt={pr.user.login}
                            className="h-3.5 w-3.5 rounded-full border border-[#3a3a3a]"
                          />
                        )}
                        <span>{pr.user.login}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-[#666666]">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(pr.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Pill Buttons with Transparent Background & 1px Outline */}
                  <div className="flex items-center gap-3 shrink-0 pt-1">
                    <button
                      onClick={() => onInspectDiff(pr)}
                      className="h-9 px-4 rounded-full border border-[#3a3a3a] hover:border-white bg-transparent text-white font-mono text-xs uppercase tracking-[2px] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>Diff</span>
                    </button>

                    <button
                      onClick={() => onStartReview(pr)}
                      className="h-9 px-5 rounded-full border border-white bg-transparent hover:bg-white hover:text-black text-white font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>AI Review</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
