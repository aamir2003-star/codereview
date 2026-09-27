'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repository, PullRequest } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
      <Card className="flex flex-col items-center justify-center h-[calc(100vh-140px)] border-neutral-800 bg-neutral-900/30 text-center p-8 backdrop-blur-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800/60 border border-neutral-700/60 text-emerald-400 mb-4 shadow-lg">
          <GitPullRequest className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-white">Select a Repository</h3>
        <p className="max-w-xs text-xs text-neutral-400 mt-1.5 leading-relaxed">
          Choose a repository from the left panel to explore open pull requests and start AI reviews.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-140px)] border-neutral-800 bg-neutral-900/40 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between backdrop-blur-md">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white truncate">{repo.full_name}</h2>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              title="Open on GitHub"
              className="text-neutral-400 hover:text-emerald-300 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            {pullRequests.length} open pull request{pullRequests.length === 1 ? '' : 's'} available
          </p>
        </div>
      </div>

      {/* PR Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 rounded-2xl bg-neutral-800/30 animate-pulse border border-neutral-800/60"
              />
            ))}
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800/40 border border-neutral-800 text-neutral-500 mb-3 shadow-inner">
              <Inbox className="h-7 w-7 opacity-60" />
            </div>
            <h3 className="text-sm font-bold text-white">No Open Pull Requests</h3>
            <p className="max-w-xs text-xs text-neutral-400 mt-1 leading-relaxed">
              There are currently no open pull requests in{' '}
              <span className="font-mono text-emerald-400 font-semibold">{repo.name}</span>.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {pullRequests.map((pr, index) => (
              <motion.div
                key={pr.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                whileHover={{ scale: 1.008 }}
                className="group rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-4 hover:border-emerald-500/40 hover:bg-neutral-900/50 hover:shadow-[0_10px_30px_rgba(16,185,129,0.08)] transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
                        <GitPullRequest className="h-3 w-3" /> #{pr.number}
                      </span>
                      <h3 className="truncate text-sm font-bold text-white group-hover:text-emerald-200 transition-colors">
                        {pr.title}
                      </h3>
                    </div>

                    {/* Branches & Meta */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-400 font-mono">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <GitBranch className="h-3 w-3 text-emerald-400" />
                        <span className="bg-neutral-800/90 border border-neutral-700/60 px-2 py-0.5 rounded-md text-emerald-300 font-semibold">
                          {pr.head.ref}
                        </span>
                        <span className="text-neutral-500">&rarr;</span>
                        <span className="bg-neutral-800/90 border border-neutral-700/60 px-2 py-0.5 rounded-md text-neutral-300">
                          {pr.base.ref}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-sans">
                        {pr.user.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pr.user.avatar_url}
                            alt={pr.user.login}
                            className="h-4 w-4 rounded-full ring-1 ring-neutral-700"
                          />
                        )}
                        <span className="text-neutral-300 font-medium">{pr.user.login}</span>
                      </div>

                      <div className="flex items-center gap-1 font-sans text-neutral-400">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(pr.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onInspectDiff(pr)}
                      className="gap-1.5 text-xs border-neutral-700/80 bg-neutral-900 hover:bg-neutral-800"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>View Diff</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => onStartReview(pr)}
                      className="gap-1.5 text-xs bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-neutral-950 font-bold shadow-md shadow-emerald-500/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>AI Review</span>
                      <ArrowRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </Card>
  );
}
