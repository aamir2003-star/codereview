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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] border border-[#262626] bg-[#0d0d0d] text-center p-8 rounded-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#262626] text-white mb-3 bg-[#141414]">
          <GitPullRequest className="h-6 w-6 text-[#a1a1aa]" />
        </div>
        <h3 className="text-base font-semibold text-white tracking-tight">
          Select a repository
        </h3>
        <p className="text-xs sm:text-sm text-[#a1a1aa] max-w-xs mt-1.5 leading-relaxed">
          Choose a repository from the left sidebar to inspect pull requests and stream AI reviews.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] border border-[#262626] bg-[#0d0d0d] rounded-xl overflow-hidden text-white">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#262626] bg-[#141414] flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-white truncate tracking-tight">
              {repo.full_name}
            </h2>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              title="View on GitHub"
              className="text-[#71717a] hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5 font-mono">
            {pullRequests.length} open pull request{pullRequests.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* PR Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#262626]">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-[#141414] animate-pulse rounded-lg border border-[#262626]" />
            ))}
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#71717a]">
            <Inbox className="h-8 w-8 opacity-40 mb-2" />
            <span className="text-xs font-medium">No open pull requests</span>
            <p className="text-xs text-[#71717a] max-w-xs mt-1">
              All pull requests in {repo.name} have been merged or closed.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {pullRequests.map((pr) => (
              <div
                key={pr.id}
                className="p-4 sm:p-5 bg-transparent hover:bg-[#141414] transition-colors relative group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* PR Number + Title */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#a1a1aa] bg-[#18181b] px-2 py-0.5 rounded border border-[#262626] shrink-0">
                        #{pr.number}
                      </span>
                      <h3 className="text-sm sm:text-base font-medium text-white group-hover:text-[#e4e4e7] transition-colors truncate">
                        {pr.title}
                      </h3>
                    </div>

                    {/* Metadata: Branch & Author */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#a1a1aa]">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#d4d4d8]">
                        <GitBranch className="h-3 w-3 text-white" />
                        <span>{pr.head.ref}</span>
                        <span className="text-[#52525b]">&rarr;</span>
                        <span>{pr.base.ref}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
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

                      <div className="flex items-center gap-1 text-[11px] text-[#71717a]">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(pr.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      onClick={() => onInspectDiff(pr)}
                      className="h-8 px-3 rounded-lg border border-[#3a3a3a] hover:border-white bg-transparent text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>View Diff</span>
                    </button>

                    <button
                      onClick={() => onStartReview(pr)}
                      className="h-8 px-3.5 rounded-lg border border-white bg-white text-black hover:bg-[#e4e4e7] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-black" />
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
