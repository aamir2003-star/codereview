'use client';

import React, { useState } from 'react';
import { Repository } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Search, FolderGit2, Lock, Globe, Star, CircleDot } from 'lucide-react';

interface RepoListProps {
  repos: Repository[];
  selectedRepo: Repository | null;
  onSelectRepo: (repo: Repository) => void;
  isLoading: boolean;
}

export function RepoList({
  repos,
  selectedRepo,
  onSelectRepo,
  isLoading,
}: RepoListProps) {
  const [search, setSearch] = useState('');

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="flex flex-col h-[calc(100vh-140px)] border-neutral-800 bg-neutral-900/50 backdrop-blur-xl p-0 overflow-hidden">
      {/* Header & Search */}
      <div className="p-4 border-b border-neutral-800/80 bg-neutral-900/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Repositories</h2>
          </div>
          <span className="text-xs font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700/50">
            {repos.length}
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950/80 pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-400 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      {/* Repo Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-neutral-800/40">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-16 rounded-xl bg-neutral-800/40 animate-pulse"
              />
            ))}
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-neutral-400">
            <FolderGit2 className="h-8 w-8 text-neutral-400 mb-2 opacity-40" />
            <p className="font-medium text-neutral-400">No repositories found</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Try a different search or make sure your account has repo access.
            </p>
          </div>
        ) : (
          filteredRepos.map((repo) => {
            const isSelected = selectedRepo?.id === repo.id;
            return (
              <button
                key={repo.id}
                onClick={() => onSelectRepo(repo)}
                className={`w-full text-left rounded-xl p-3 transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'bg-neutral-900/30 border-transparent hover:bg-neutral-800/50 hover:border-neutral-700/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {repo.private ? (
                        <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                      ) : (
                        <Globe className="h-3 w-3 text-neutral-400 shrink-0" />
                      )}
                      <p className="truncate text-xs font-semibold text-white">
                        {repo.name}
                      </p>
                    </div>
                    <p className="truncate text-[11px] text-neutral-400 mt-0.5">
                      {repo.owner.login}
                    </p>
                  </div>

                  {repo.stargazers_count > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 shrink-0">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span>{repo.stargazers_count}</span>
                    </div>
                  )}
                </div>

                {repo.description && (
                  <p className="line-clamp-1 text-[11px] text-neutral-400 mt-1.5">
                    {repo.description}
                  </p>
                )}

                <div className="mt-2.5 flex items-center gap-3 text-[10px] text-neutral-400 font-mono">
                  {repo.language && (
                    <span className="flex items-center gap-1 text-emerald-400/90">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {repo.language}
                    </span>
                  )}
                  {repo.open_issues_count > 0 && (
                    <span className="flex items-center gap-1">
                      <CircleDot className="h-3 w-3 text-neutral-400" />
                      {repo.open_issues_count} open
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </Card>
  );
}
